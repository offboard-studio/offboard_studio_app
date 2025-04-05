from dataclasses import dataclass
from typing import TypeVar, Generic, Iterator


# T is a generic type that must be a subclass of models.Model
T = TypeVar('T')


@dataclass
class Pagination(Generic[T]):
    page: int
    per_page: int
    total_pages: int
    total_items: int
    items: Iterator[T]

    def to_dict(self):
        return {
            "page": self.page,
            "per_page": self.per_page,
            "total_pages": self.total_pages,
            "total_items": self.total_items,
            "items": [item for item in self.items]
        }