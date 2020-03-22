import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import About from "@/pages/About";

export const routes = [
  NotFound,
  {
    home: {
      path: "",
      component: Home
    },
    about: {
      path: "/about",
      component: About
    },
  }
];
