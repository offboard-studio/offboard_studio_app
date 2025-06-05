import { useRouteError } from 'react-router-dom';

export const ErrorPage = (): JSX.Element => {
  const error = useRouteError();
  return (
    <div className="text-center p-5 text-xl">
      <h1 className="text-xl text-slate-900">Sorry, an error has occurred</h1>
      {isError(error) && (
        <p className="text-base text-slate-700">{error.statusText}</p>
      )}
    </div>
  );
};

function isError(error: unknown): error is { statusText: string } {
  return typeof error === 'object' && error !== null && 'statusText' in error;
}
