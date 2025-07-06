import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import Nora from "@primevue/themes/nora";

const app = createApp(App);

app.use(router);
app.use(PrimeVue, {
	theme: {
		preset: Nora,
		options: {
			prefix: "p",
			darkModeSelector: "system",
			cssLayer: {
				name: "primevue",
				order: "theme, base, primevue",
			},
		},
	},
});
app.use(ToastService);

app.mount("#app");
