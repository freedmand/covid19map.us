import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";

export const routes = [
  NotFound,
  {
    home: {
      path: "",
      component: Home
    },
  }
];
