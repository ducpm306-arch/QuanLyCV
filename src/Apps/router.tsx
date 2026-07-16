// router.tsx
import { createBrowserRouter } from "react-router-dom";
import { Home } from "../Modules/Home/Pages/Home";
import { UploadCV } from "../Modules/UploadCV/Pages/UploadCV";
import { ManageCV } from "../Modules/ManageCV/Pages/ManageCV";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    children: [
      {
        index: true,
        element: <ManageCV />,
      },
      {
        path: "upload-cv",
        element: <UploadCV />,
      },
      {
        path: "manage-cv",
        element: <ManageCV />,
      },
    ],
  },
]);
