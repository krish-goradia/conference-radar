import {BrowserRouter,Routes,Route} from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import SharedDashboard from "./pages/SharedDashboard"

export default function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path = "/" element = {<Login />}/>
        <Route path ="/dashboard" element = {<Dashboard/>}/>
        <Route path ="/user/:userId" element = {<SharedDashboard/>}/>
      </Routes>
    </BrowserRouter>
  );
}