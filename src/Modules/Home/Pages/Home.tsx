import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import NavBar from "../Components/NavBar";
import SideBar from "../Components/SideBar";
import { Outlet } from "react-router-dom";

export const Home = () => {
  return (
    <>
      <NavBar></NavBar>
      <div className="row">
        <div className="col-2">
          <SideBar></SideBar>
        </div>

        <div className="col-10">
          <div
            data-bs-spy="scroll"
            data-bs-target="#navbar-example3"
            data-bs-smooth-scroll="true"
            className="scrollspy-example-2"
            tabIndex={0}
          ></div>
          <Outlet></Outlet>
        </div>
      </div>
    </>
  );
};
