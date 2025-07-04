import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(router);

// Global error handler
app.config.errorHandler = (error, _instance, info) => {
	console.error("Vue error:", error, info);
	// You can send errors to a logging service here
};

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
	console.error("Unhandled promise rejection:", event.reason);
	// Prevent the default browser behavior
	event.preventDefault();
});

// Handle global errors
window.addEventListener("error", (event) => {
	console.error("Global error:", event.error);
});

app.mount("#app");
