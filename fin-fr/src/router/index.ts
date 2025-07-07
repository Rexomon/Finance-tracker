import { createRouter, createWebHistory } from "vue-router";
import { checkAuthStatus } from "../utils/auth";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "home",
			component: HomeView,
		},
		{
			path: "/about",
			name: "about",
			// route level code-splitting
			// this generates a separate chunk (About.[hash].js) for this route
			// which is lazy-loaded when the route is visited.
			component: () => import("../views/AboutView.vue"),
		},
		{
			path: "/signup",
			name: "signup",
			component: () => import("../views/SignupView.vue"),
		},
		{
			path: "/login",
			name: "login",
			component: () => import("../views/LoginView.vue"),
		},
		{
			path: "/dashboard",
			name: "dashboard",
			component: () => import("../views/DashboardView.vue"),
			meta: { requiresAuth: true },
		},
		{
			path: "/:pathMatch(.*)*",
			name: "NotFound",
			redirect: "/",
		},
	],
});

// Add navigation guards
router.beforeEach(async (to, _from, next) => {
	// Handle any navigation errors
	try {
		const isAuthenticated = await checkAuthStatus();

		// Check if route requires authentication
		if (to.meta.requiresAuth) {
			if (!isAuthenticated) {
				next("/login");
				return;
			}
		}

		// Redirect to dashboard if user is already logged in and trying to access login/signup
		if ((to.name === "login" || to.name === "signup") && isAuthenticated) {
			next("/dashboard");
			return;
		}

		next();
	} catch (error) {
		console.error("Navigation error:", error);
		next("/");
	}
});

// Handle router errors
router.onError((error) => {
	console.error("Router error:", error);
	// Redirect to home on router errors
	router.push("/");
});

export default router;
