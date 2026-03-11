from typing import List, Dict

MENU: List[Dict] = [
    {"code": "cap", "name": "Капучино", "price": 200},
    {"code": "ame", "name": "Американо", "price": 150},
    {"code": "lat", "name": "Латте", "price": 220},
    {"code": "raf", "name": "Раф", "price": 250},
]


def find_item(code: str) -> Dict | None:
    for it in MENU:
        if it["code"] == code:
            return it
    return None
