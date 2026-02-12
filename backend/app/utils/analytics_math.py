from math import exp


def moving_average(values: list[float], window: int = 3) -> list[float]:
    if window <= 1:
        return values[:]
    out = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        chunk = values[start : i + 1]
        out.append(sum(chunk) / max(1, len(chunk)))
    return out


def confidence_decay(value: float, age_days: float, half_life_days: float = 7.0) -> float:
    if value <= 0:
        return 0.0
    if half_life_days <= 0:
        return value
    decay = exp(-0.693 * (age_days / half_life_days))
    return value * decay


def growth_rate(prev: float, curr: float) -> float:
    if prev <= 0:
        return 0.0 if curr <= 0 else 1.0
    return (curr - prev) / prev


def normalize(value: float, min_v: float, max_v: float) -> float:
    if max_v <= min_v:
        return 0.0
    return max(0.0, min(1.0, (value - min_v) / (max_v - min_v)))
