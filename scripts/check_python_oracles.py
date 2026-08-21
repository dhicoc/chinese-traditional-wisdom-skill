"""Verify default offline-oracle imports in an isolated or freshly installed environment."""
from lunar_python import Solar
from iztro_py import by_solar
import requests

# Synthetic smoke values only. Outputs are intentionally not persisted.
assert Solar.fromYmd(2000, 1, 1).getYear() == 2000
assert by_solar("2000-1-1", 6, "男") is not None
assert requests.__version__
print("python offline-oracle core imports: ok")
