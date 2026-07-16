import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { NavLink } from "react-router-dom";

function SideBar() {
  return (
    <>
      <nav
        id="navbar-example3"
        className="h-100 flex-column align-items-stretch pe-4 border-end"
      >
        <nav className="nav nav-pills flex-column">
          <NavLink className="nav-link" to={"/upload-cv"}>
            Upload CV
          </NavLink>
          <NavLink className="nav-link" to={"/manage-cv"}>
            Manage CV
          </NavLink>
        </nav>
      </nav>
    </>
  );
}

export default SideBar;
