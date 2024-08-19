import React from 'react';
import {Routes, Route} from 'react-router-dom';
import Home from './pages/Home';
import CreateTrail from './pages/CreateTrail';
import EditTrail from './pages/EditTrail';
import DeleteTrail from './pages/DeleteTrail';
import ShowTrail from './pages/ShowTrail';

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<Home></Home>} ></Route>
      <Route path='/trails/create' element={<CreateTrail></CreateTrail>} ></Route>
      <Route path='/trails/details/:id' element={<ShowTrail></ShowTrail>} ></Route>
      <Route path='/trails/edit/:id' element={<EditTrail></EditTrail>} ></Route>
      <Route path='/trails/remove/:id' element={<DeleteTrail></DeleteTrail>} ></Route>
    </Routes>
  )
}

export default App;