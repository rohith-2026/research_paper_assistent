import os
import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import TextVectorization



class VectorizerService:
    def __init__(self, artifacts_dir: str):
        self.artifacts_dir = artifacts_dir
        self.vectorizer: TextVectorization | None = None

    def load(self) -> None:
        config_path = os.path.join(self.artifacts_dir, "text_vectorizer_config.pkl")
        vocab_path = os.path.join(self.artifacts_dir, "text_vectorizer_vocab.pkl")
        idf_path = os.path.join(self.artifacts_dir, "text_vectorizer_idf_weights.pkl")

        with open(config_path, "rb") as f:
            cfg = pickle.load(f)

        with open(vocab_path, "rb") as f:
            vocab_obj = pickle.load(f)

        # normalize vocab type
        if isinstance(vocab_obj, list):
            vocab_list = vocab_obj
        elif isinstance(vocab_obj, dict):
            vocab_list = vocab_obj.get("vocab") or vocab_obj.get("vocabulary")
            if vocab_list is None:
                raise ValueError(f"Unknown vocab dict keys: {list(vocab_obj.keys())}")
        else:
            raise ValueError(f"Unsupported vocab type: {type(vocab_obj)}")

        with open(idf_path, "rb") as f:
            idf_weights = pickle.load(f)

        idf_weights = np.asarray(idf_weights, dtype=np.float32)

        if cfg.get("output_mode") != "tf_idf":
            raise ValueError(f"Expected output_mode='tf_idf' but got: {cfg.get('output_mode')}")

        tv = TextVectorization(
            max_tokens=cfg.get("max_tokens"),
            ngrams=cfg.get("ngrams"),
            output_mode="tf_idf",
            standardize=cfg.get("standardize"),
            split=cfg.get("split"),
        )

        # IMPORTANT: set vocab + idf
        tv.set_vocabulary(vocab_list, idf_weights=idf_weights)
        self.vectorizer = tv

    def transform(self, texts: list[str]) -> tf.Tensor:
        if self.vectorizer is None:
            raise RuntimeError("Vectorizer not loaded")
        return self.vectorizer(tf.constant(texts))
