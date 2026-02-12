# app/services/model_service.py
import os
import json
import zipfile
import tempfile
import keras  # OK Keras v3 loader


def _patch_config(config: dict) -> dict:
    """
    Patch Keras config for compatibility.
      - InputLayer: batch_shape -> batch_input_shape
      - dtype policy dict -> "float32"
    """

    def fix_dtype_policy(value):
        if isinstance(value, dict):
            class_name = value.get("class_name")
            cfg = value.get("config", {})
            if class_name in ["DTypePolicy", "Policy"] and "name" in cfg:
                return cfg["name"]
        return value

    def walk(obj):
        if isinstance(obj, dict):
            new = {}
            for k, v in obj.items():
                if k == "batch_shape":
                    new["batch_input_shape"] = walk(v)
                    continue
                if k == "dtype":
                    new[k] = walk(fix_dtype_policy(v))
                    continue
                new[k] = walk(v)
            return new
        if isinstance(obj, list):
            return [walk(x) for x in obj]
        return obj

    return walk(config)


class ModelService:
    """
    OK Correct loader for Keras v3 `.keras` archive:
    Uses keras.saving.load_model (NOT tf.keras)
    """

    def __init__(self, artifacts_dir: str):
        self.artifacts_dir = artifacts_dir
        self.model = None

    def load(self) -> None:
        keras_path = os.path.join(self.artifacts_dir, "shallow_mlp_model.keras")
        if not os.path.exists(keras_path):
            raise FileNotFoundError(f"Missing model file: {keras_path}")

        # OK First: load directly with keras v3
        try:
            self.model = keras.saving.load_model(keras_path, compile=False)
            print("OK Model loaded successfully (keras v3).")
            return
        except Exception as e:
            print("WARN Direct keras load failed, patching config.json only...")
            print("Reason:", str(e))

        # OK Patch config.json ONLY, preserve weights untouched
        with tempfile.TemporaryDirectory() as tmpdir:
            patched_path = os.path.join(tmpdir, "patched_model.keras")

            with zipfile.ZipFile(keras_path, "r") as zin:
                names = zin.namelist()

                if "config.json" not in names:
                    raise RuntimeError("Invalid .keras file: config.json missing")

                config = json.loads(zin.read("config.json").decode("utf-8"))
                patched_config = _patch_config(config)

                with zipfile.ZipFile(patched_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                    for name in names:
                        if name == "config.json":
                            zout.writestr("config.json", json.dumps(patched_config))
                        else:
                            zout.writestr(name, zin.read(name))

            # OK Load patched with keras v3
            self.model = keras.saving.load_model(patched_path, compile=False)
            print("OK Model loaded successfully after patching config.")

    def predict(self, x):
        if self.model is None:
            raise RuntimeError("Model not loaded")
        return self.model.predict(x, verbose=0)
