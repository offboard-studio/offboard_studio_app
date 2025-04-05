from dataclasses import dataclass
from typing import TypeVar, Generic, Union, List


# T is a generic type that must be a subclass of models.Model
T = TypeVar('T')


@dataclass
class Response(Generic[T]):
    code: int
    error: bool
    messages: List[str]
    data: Union[T, None]

    def to_dict(self):
        return {
            "code": self.code,
            "error": self.error,
            "messages": self.messages,
            "data": self.data
        }
