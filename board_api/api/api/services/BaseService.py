from uuid import UUID
from typing import Type, TypeVar, Generic

from django.db import models

from api.repositories import BaseRepository


# T is a generic type that must be a subclass of BaseRepository
T = TypeVar('T', bound=models.Model)


class BaseService(Generic[T]):
    repository: Type[BaseRepository[T]]  # to be overridden by child classes

    @classmethod
    def get(cls, pk: UUID):
        return cls.repository.get(pk)

    @classmethod
    def exists(cls, *args, **kwargs):
        return cls.repository.exists(*args, **kwargs)

    @classmethod
    def filter(cls, *args, **kwargs):
        return cls.repository.filter(*args, **kwargs)

    @classmethod
    def exclude(cls, **kwargs):
        return cls.repository.exclude(**kwargs)

    @classmethod
    def create(cls, **kwargs):
        return cls.repository.create(**kwargs)

    @classmethod
    def update(cls, pk: UUID, **kwargs):
        instance = cls.repository.get(pk)
        return cls.repository.update(instance, **kwargs)

    @classmethod
    def delete(cls, pk: UUID):
        instance = cls.repository.get(pk)
        cls.repository.delete(instance)

    @classmethod
    def all(cls):
        return cls.repository.all()

    @classmethod
    def clear(cls):
        cls.repository.clear()
