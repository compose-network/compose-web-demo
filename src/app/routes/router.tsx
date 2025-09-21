import { DashboardLayout } from "@/app/layouts/dashboard/dashboard";
import { proxy, useSnapshot } from "valtio";

import { Compliance } from "@/app/routes/compliance";
import { Maintenance } from "@/app/routes/maintenance";
import type { RouteObject } from "react-router-dom";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { NotFound } from "./not-found";
import type { RoutePaths, WritableRoutePaths } from "./router/route-types";
import { Swap } from "@/components/swap/swap";
import { MainPage } from "@/components/swap/main";
import { Bridge } from "@/components/swap/brideg";

const routes = [
  {
    path: "",
    element: (
      <DashboardLayout>
        <MainPage>
          <Outlet />
        </MainPage>
      </DashboardLayout>
    ),
    children: [
      {
        path: "",
        element: <Swap />,
      },
      {
        path: "bridge",
        element: <Bridge />,
      },
    ],
  },
  {
    path: "/compliance",
    element: (
      <DashboardLayout>
        <Compliance />
      </DashboardLayout>
    ),
  },
  {
    path: "/maintenance",
    element: <Maintenance />,
  },
  {
    path: "*",
    element: (
      <DashboardLayout>
        <NotFound />
      </DashboardLayout>
    ),
  },
] as const satisfies RouteObject[];

export type AppRoutePaths = RoutePaths<typeof routes>;
export type AppWritableRoutePaths = WritableRoutePaths<typeof routes>;

export const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter(routes);

export const locationState = proxy({
  current: router.state.location,
  previous: router.state.location,
  history: [router.state.location],
});

router.subscribe((state) => {
  locationState.previous = JSON.parse(JSON.stringify(locationState.current));
  locationState.current = state.location;

  if (state.historyAction === "PUSH") {
    locationState.history.push(state.location);
  } else if (state.historyAction === "POP") {
    locationState.history.pop();
  } else if (state.historyAction === "REPLACE") {
    locationState.history[locationState.history.length - 1] = state.location;
  }
});

export const useLocationState = () => {
  return useSnapshot(locationState);
};
