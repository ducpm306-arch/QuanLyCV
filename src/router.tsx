// router.tsx
import { createBrowserRouter } from "react-router-dom";
import { Home } from "./Home/Pages/Home";
import { UploadCV } from "./UploadCV/Pages/UploadCV";
import { ManageCV } from "./ManageCV/Pages/ManageCV";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/upload-cv",
    element: <UploadCV />,
  },
  {
    path: "/manage-cv",
    element: <ManageCV />,
  },
]);
