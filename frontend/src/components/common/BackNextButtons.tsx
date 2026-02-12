import { useNavigate } from "react-router-dom";

export default function BackNextButtons() {
  const nav = useNavigate();

  return (
    <div className="flex gap-3">
      <button className="btn-secondary" onClick={() => nav(-1)}>
        ← Back
      </button>
      <button className="btn-secondary" onClick={() => nav(1)}>
        Next →
      </button>
    </div>
  );
}
