from uuid import UUID
from typing import Type, TypeVar, Generic, Iterable, Sequence

from django.db import models
from django.db.models.signals import post_save, pre_save


# T is a generic type that must be a subclass of models.Model
T = TypeVar('T', bound=models.Model)


class BaseRepository(Generic[T]):
    model: Type[T]  # to be overridden by child classes

    @classmethod
    def get(cls, pk: UUID):
        return cls.model.objects.get(pk=pk)

    @classmethod
    def exists(cls, *args, **kwargs):
        return cls.model.objects.filter(*args, **kwargs).exists()

    @classmethod
    def values_list(cls, *fields: str, flat: bool = False, named: bool = False):
        return cls.model.objects.values_list(*fields, flat=flat, named=named)

    @classmethod
    def in_bulk(cls, pks: Iterable[UUID], field_name: str = "id"):
        return cls.model.objects.in_bulk(pks, field_name=field_name)

    @classmethod
    def filter(cls, *args, **kwargs):
        return cls.model.objects.filter(*args, **kwargs)

    @classmethod
    def annotate(cls, **kwargs):
        return cls.model.objects.annotate(**kwargs)

    @classmethod
    def exclude(cls, **kwargs):
        return cls.model.objects.exclude(**kwargs)

    @classmethod
    def create(cls, **kwargs):
        return cls.model.objects.create(**kwargs)

    @classmethod
    def bulk_create(cls, instances: Iterable[T]):
        for instance in instances:
            # sending pre_save signal for individual object
            pre_save.send(instance.__class__, instance=instance, created=True)

        result = cls.model.objects.bulk_create(instances)

        for instance in instances:
            # sending post_save signal for individual object
            post_save.send(instance.__class__, instance=instance, created=True)

        return result

    @classmethod
    def update(cls, pk: UUID, **kwargs):
        instance = cls.model.objects.get(pk=pk)
        for key, value in kwargs.items():
            setattr(instance, key, value)
        instance.save()
        return instance

    @classmethod
    def bulk_update(cls, instances: Iterable[T], fields: Sequence[str]):
        for instance in instances:
            # sending pre_save signal for individual object
            pre_save.send(instance.__class__, instance=instance, created=False)

        result =  cls.model.objects.bulk_update(instances, fields)

        for instance in instances:
            # sending post_save signal for individual object
            post_save.send(instance.__class__, instance=instance, created=False)

        return result

    @classmethod
    def delete(cls, pk: UUID):
        instance = cls.model.objects.get(pk=pk)
        instance.delete()

    @classmethod
    def all(cls):
        return cls.model.objects.all()

    @classmethod
    def clear(cls):
        cls.model.objects.all().delete()
