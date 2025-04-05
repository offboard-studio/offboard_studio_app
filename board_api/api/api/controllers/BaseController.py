from inspect import getmembers, isfunction
from pydantic import ValidationError
from typing import List, Callable, Type

from django.urls import URLResolver, path, URLPattern
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    parser_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response as RestResponse

from api.objects import GeneralException, Response


class ControllerAttributes:
    # Base path to access the endpoints of this controller
    _route: str
    # Name of the controller to identify it from the rest
    _name: str


def controller(route: str, name: str):
    """
    Decorator for classes that will be used as controllers.

    Parameters:
        - `route`: The route that this controller will be attached to.
        - `name`: The name of the controller.

    Returns:
        - The decorator that will be used to decorate the class.
    """
    def class_decorator(cls: Type[ControllerAttributes]):
        cls._route = route
        cls._name = name
        return cls
    return class_decorator


def endpoint(
    route: str,
    methods: List[str],
    is_authenticated: bool = False,
    parsers: List = []
):
    """
    Decorator for methods that will be used as endpoints.

    Parameters:
        - `route`: The sub-route that this endpoint will be attached to.
        - `methods`: The HTTP methods that this endpoint will respond to.
        - `is_authenticated`: Whether or not this endpoint requires authentication.

    Returns:
        - The decorator that will be used to decorate the method.
    """

    def get_safe_func(func: Callable):
        """
        Wraps the function in a try-except block to catch any exceptions that are thrown.
        """
        def safe_func(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except ValidationError as e:
                return RestResponse(
                    status=status.HTTP_200_OK,
                    data=Response(
                        code=11,
                        error=True,
                        messages=[f"{error['loc'][0]}: {error['msg']}" for error in e.errors()],
                        data=None,
                    ).to_dict()
                )
            except GeneralException as e:
                return RestResponse(
                    status=status.HTTP_200_OK,
                    data=Response(
                        code=e.code,
                        error=True,
                        messages=e.messages,
                        data=None,
                    ).to_dict()
                )
            except Exception as e:
                traceback = e.__traceback__
                while traceback.tb_next:
                    traceback = traceback.tb_next
                file = traceback.tb_frame.f_code.co_filename
                line = traceback.tb_lineno
                error = f"{file}:{line}: {str(e)}"
                return RestResponse(
                    status=status.HTTP_200_OK,
                    data=Response(
                        code=1,
                        error=True,
                        messages=[error],
                        data=None,
                    ).to_dict()
                )

        return safe_func

    def method_decorator(func: Callable):
        """
        Decorates the function with the necessary attributes for the API.
        """
        if is_authenticated:
            auth_decorator = permission_classes([IsAuthenticated])
        else:
            auth_decorator = lambda func: permission_classes(
                [AllowAny])(authentication_classes([])(func)
            )

        api_func = api_view(methods)(
            parser_classes(parsers)(auth_decorator(get_safe_func(func)))
        )

        setattr(api_func, "_methods", methods)
        setattr(api_func, "_route", route)
        setattr(api_func, "_co_firstlineno", func.__code__.co_firstlineno)

        return api_func

    return method_decorator


@controller(route="", name="Base")
class BaseController(ControllerAttributes):
    """
    Base controller class.
    """

    @classmethod
    def get_paths(cls) -> List[URLPattern | URLResolver]:
        """
        List all the endpoints in this controller.

        Returns:
            - A list of all the endpoints in this controller.
        """
        paths: List[URLPattern | URLResolver] = []

        methods = getmembers(cls)
        filtered_methods = filter(lambda x: hasattr(x[1], "_co_firstlineno"), methods)
        sorted_methods = sorted(
            filtered_methods,
            key=lambda x: getattr(x[1], "_co_firstlineno"),
        )

        for attr_name, attr in sorted_methods:
            if hasattr(attr, "_route"):
                paths.append(path(
                    route=f"{cls._route}/{getattr(attr, '_route')}",
                    view=attr,
                    name=f"{cls._name}_{attr_name}"
                ))
        return paths
