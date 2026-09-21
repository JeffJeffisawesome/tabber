"""Sample items CRUD router."""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from app.schemas import Item, ItemCreate

router = APIRouter(prefix="/items", tags=["items"])

# In-memory storage seeded with starter items
_ITEMS_DB: List[Item] = [
    Item(
        id=1,
        title="Welcome to Tabber",
        description="This is a starter item fetched from the FastAPI backend.",
        category="General",
        created_at=datetime.now(timezone.utc),
    ),
    Item(
        id=2,
        title="Explore TypeScript SPA",
        description="Frontend is built with React 18, TypeScript, and Vite.",
        category="Frontend",
        created_at=datetime.now(timezone.utc),
    ),
    Item(
        id=3,
        title="Explore FastAPI Backend",
        description="Automatic OpenAPI docs available at http://localhost:8000/docs.",
        category="Backend",
        created_at=datetime.now(timezone.utc),
    ),
]
_next_id: int = 4


@router.get("", response_model=List[Item])
async def list_items(category: Optional[str] = None) -> List[Item]:
    """Retrieve all items, optionally filtered by category."""
    if category:
        return [item for item in _ITEMS_DB if item.category.lower() == category.lower()]
    return list(_ITEMS_DB)


@router.get("/{item_id}", response_model=Item)
async def get_item(item_id: int) -> Item:
    """Retrieve an item by its unique identifier."""
    for item in _ITEMS_DB:
        if item.id == item_id:
            return item
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Item with ID {item_id} not found",
    )


@router.post("", response_model=Item, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate) -> Item:
    """Create a new item."""
    global _next_id
    new_item = Item(
        id=_next_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        created_at=datetime.now(timezone.utc),
    )
    _next_id += 1
    _ITEMS_DB.append(new_item)
    return new_item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int) -> None:
    """Delete an item by its unique identifier."""
    global _ITEMS_DB
    for index, item in enumerate(_ITEMS_DB):
        if item.id == item_id:
            _ITEMS_DB.pop(index)
            return
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Item with ID {item_id} not found",
    )

