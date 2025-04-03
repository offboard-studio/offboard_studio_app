import * as ReactDOM from 'react-dom/client';
import './main.module.scss';
import App from './app/App';

const htmlRoot = document.getElementById('root');

if (htmlRoot) {
  const ReactRoot = ReactDOM.createRoot(htmlRoot);

  ReactRoot.render(<App />);
} else {
  console.log('No root HTML element found.');
}
