"""
Guía temporal para configurar y cargar datos del menú a Firebase Firestore.

Este archivo NO es usado por el HTML/JS del menú.
Puedes borrarlo después de aprender a usarlo y la web seguirá funcionando igual.

Uso rápido en VS Code:
1) Abre la terminal en la carpeta del proyecto.
2) (Opcional) Crea entorno virtual:
   python -m venv .venv
   source .venv/bin/activate   # En Windows: .venv\Scripts\activate
3) Instala dependencia:
   pip install firebase-admin
4) Exporta credencial del service account en variable de entorno (NO subirla a git):
   export GOOGLE_APPLICATION_CREDENTIALS="/ruta/tu-service-account.json"
   # En Windows PowerShell:
   # $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\tu-service-account.json"
5) Ejecuta:
   python firebase_setup_guide.py
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore


@dataclass
class MenuProduct:
    name: str
    description: str
    price: str


def init_firestore() -> firestore.Client:
    """Inicializa Firebase Admin SDK usando GOOGLE_APPLICATION_CREDENTIALS."""
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
    return firestore.client()


def seed_menu(db: firestore.Client) -> None:
    """Crea colecciones: sections y products, con referencias por sectionId."""
    menu_data: dict[str, list[MenuProduct]] = {
        "Clásicos": [
            MenuProduct("Cosmopolitan", "Vodka, arándanos, limón", "$130"),
            MenuProduct("Blue Lagoon", "Vodka, curaçao, limón, soda", "$135"),
        ],
        "Tikis": [
            MenuProduct("Piña colada", "Ron, jugo de piña, crema de coco", "$140"),
            MenuProduct("Hawaii Azul", "Ron, curaçao, zumo piña, crema coco", "$145"),
        ],
        "Vinos": [
            MenuProduct("Tinto de Verano", "Vino tinto y soda", "$120"),
        ],
    }

    sections_ref = db.collection("sections")
    products_ref = db.collection("products")

    for section_order, (section_name, products) in enumerate(menu_data.items()):
        section_doc = sections_ref.document()
        section_doc.set(
            {
                "name": section_name,
                "order": section_order,
                "createdAt": datetime.now(timezone.utc),
            }
        )

        for product_order, product in enumerate(products):
            products_ref.document().set(
                {
                    "sectionId": section_doc.id,
                    "name": product.name,
                    "description": product.description,
                    "price": product.price,
                    "order": product_order,
                    "createdAt": datetime.now(timezone.utc),
                }
            )

    print("✅ Datos de ejemplo cargados en Firestore (sections/products).")


def print_collection_shape() -> None:
    """Muestra cómo deben verse tus documentos en Firestore."""
    print("\nEstructura recomendada de Firestore:\n")
    print("sections/{sectionId}")
    print("  - name: string")
    print("  - order: number")
    print("  - createdAt: timestamp")
    print("\nproducts/{productId}")
    print("  - sectionId: string (id de sections)")
    print("  - name: string")
    print("  - description: string")
    print("  - price: string")
    print("  - order: number")
    print("  - createdAt: timestamp\n")


if __name__ == "__main__":
    print_collection_shape()
    db_client = init_firestore()
    seed_menu(db_client)
