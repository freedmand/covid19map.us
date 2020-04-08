import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import ThreeD from '@/pages/3D';

export const routes = [
  NotFound,
  {
    home: {
      path: "",
      component: Home
    },
    '3d': {
      path: '3d',
      component: ThreeD
    }
  }
];
