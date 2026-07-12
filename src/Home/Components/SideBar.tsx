import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function SideBar() {
  return (
    <>
      <nav
        id="navbar-example3"
        className="h-100 flex-column align-items-stretch pe-4 border-end"
      >
        <nav className="nav nav-pills flex-column">
          <a className="nav-link" href="#UploadCV">
            Upload CV
          </a>
          <a className="nav-link" href="#ManageCV">
            Manage CV
          </a>
        </nav>
      </nav>
    </>
  );
}

export default SideBar;
