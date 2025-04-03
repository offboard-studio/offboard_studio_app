import { Routes, Route, HashRouter } from 'react-router-dom';
import { HomePage, GuidePage, PageRoutePaths } from '@components';
import './App.module.scss';

const App = (): JSX.Element => (
  <HashRouter>
    <Routes>
      <Route path={PageRoutePaths.HOME} element={<HomePage />} />
      <Route path={PageRoutePaths.GUIDE} element={<GuidePage />} />
    </Routes>
  </HashRouter>
);

export default App;
