// vite.config.ts
import { defineConfig, loadEnv } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const enablePWA = String(env.VITE_ENABLE_PWA ?? "true") === "true";
  return {
    plugins: [
      react({
        jsxRuntime: "automatic"
      }),
      ...command === "build" && enablePWA ? [VitePWA({
        registerType: "autoUpdate",
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true
        },
        includeAssets: ["logo.svg", "mask-icon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "OstheoApp - Gestion de cabinet",
          short_name: "OstheoApp",
          description: "Application de gestion pour ost\xE9opathes",
          theme_color: "#0A84FF",
          background_color: "#ffffff",
          display: "standalone",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
          ]
        }
      })] : []
    ],
    server: {
      port: 5175,
      strictPort: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    },
    build: {
      target: "esnext",
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("firebase")) return "firebase";
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
              if (id.includes("chart.js") || id.includes("react-chartjs")) return "charts";
              if (id.includes("framer-motion")) return "animations";
              if (id.includes("crypto-js") || id.includes("browser-image-compression")) return "crypto-utils";
              return "vendor";
            }
            if (id.includes("/src/pages/admin/")) return "admin";
            if (id.includes("/src/components/admin/")) return "admin-components";
            if (id.includes("/src/pages/patients/")) return "patients";
            if (id.includes("/src/pages/consultations/")) return "consultations";
            if (id.includes("/src/pages/invoices/")) return "invoices";
            if (id.includes("/src/components/modals/")) return "modals";
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IGNvbW1hbmQsIG1vZGUgfSkgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcbiAgY29uc3QgZW5hYmxlUFdBID0gU3RyaW5nKGVudi5WSVRFX0VOQUJMRV9QV0EgPz8gJ3RydWUnKSA9PT0gJ3RydWUnO1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3Qoe1xuICAgICAgICBqc3hSdW50aW1lOiAnYXV0b21hdGljJyxcbiAgICAgIH0pLFxuICAgICAgLi4uKGNvbW1hbmQgPT09ICdidWlsZCcgJiYgZW5hYmxlUFdBID8gW1ZpdGVQV0Eoe1xuICAgICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgICAgd29ya2JveDoge1xuICAgICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcbiAgICAgICAgICBza2lwV2FpdGluZzogdHJ1ZSxcbiAgICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgaW5jbHVkZUFzc2V0czogWydsb2dvLnN2ZycsICdtYXNrLWljb24uc3ZnJywgJ2FwcGxlLXRvdWNoLWljb24ucG5nJ10sXG4gICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgbmFtZTogJ09zdGhlb0FwcCAtIEdlc3Rpb24gZGUgY2FiaW5ldCcsXG4gICAgICAgICAgc2hvcnRfbmFtZTogJ09zdGhlb0FwcCcsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBkZSBnZXN0aW9uIHBvdXIgb3N0XHUwMEU5b3BhdGhlcycsXG4gICAgICAgICAgdGhlbWVfY29sb3I6ICcjMEE4NEZGJyxcbiAgICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICB7IHNyYzogJ3B3YS0xOTJ4MTkyLnBuZycsIHNpemVzOiAnMTkyeDE5MicsIHR5cGU6ICdpbWFnZS9wbmcnIH0sXG4gICAgICAgICAgICB7IHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnIH0sXG4gICAgICAgICAgICB7IHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnLCBwdXJwb3NlOiAnYW55IG1hc2thYmxlJyB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KV0gOiBbXSlcbiAgICBdLFxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogNTE3NSxcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nXG4gICAgICB9XG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICAgIG1vZHVsZVByZWxvYWQ6IHsgcG9seWZpbGw6IGZhbHNlIH0sXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZmlyZWJhc2UnKSkgcmV0dXJuICdmaXJlYmFzZSc7XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QnKSB8fCBpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlcicpKSByZXR1cm4gJ3JlYWN0LXZlbmRvcic7XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnY2hhcnQuanMnKSB8fCBpZC5pbmNsdWRlcygncmVhY3QtY2hhcnRqcycpKSByZXR1cm4gJ2NoYXJ0cyc7XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZnJhbWVyLW1vdGlvbicpKSByZXR1cm4gJ2FuaW1hdGlvbnMnO1xuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2NyeXB0by1qcycpIHx8IGlkLmluY2x1ZGVzKCdicm93c2VyLWltYWdlLWNvbXByZXNzaW9uJykpIHJldHVybiAnY3J5cHRvLXV0aWxzJztcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL2FkbWluLycpKSByZXR1cm4gJ2FkbWluJztcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9jb21wb25lbnRzL2FkbWluLycpKSByZXR1cm4gJ2FkbWluLWNvbXBvbmVudHMnO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL3BhdGllbnRzLycpKSByZXR1cm4gJ3BhdGllbnRzJztcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9wYWdlcy9jb25zdWx0YXRpb25zLycpKSByZXR1cm4gJ2NvbnN1bHRhdGlvbnMnO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL2ludm9pY2VzLycpKSByZXR1cm4gJ2ludm9pY2VzJztcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9jb21wb25lbnRzL21vZGFscy8nKSkgcmV0dXJuICdtb2RhbHMnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxjQUFjLGVBQWU7QUFDL1AsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFNBQVMsS0FBSyxNQUFNO0FBQ2pELFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUMzQyxRQUFNLFlBQVksT0FBTyxJQUFJLG1CQUFtQixNQUFNLE1BQU07QUFFNUQsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLFFBQ0osWUFBWTtBQUFBLE1BQ2QsQ0FBQztBQUFBLE1BQ0QsR0FBSSxZQUFZLFdBQVcsWUFBWSxDQUFDLFFBQVE7QUFBQSxRQUM5QyxjQUFjO0FBQUEsUUFDZCxTQUFTO0FBQUEsVUFDUCxjQUFjO0FBQUEsVUFDZCxhQUFhO0FBQUEsVUFDYix1QkFBdUI7QUFBQSxRQUN6QjtBQUFBLFFBQ0EsZUFBZSxDQUFDLFlBQVksaUJBQWlCLHNCQUFzQjtBQUFBLFFBQ25FLFVBQVU7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLGFBQWE7QUFBQSxVQUNiLGFBQWE7QUFBQSxVQUNiLGtCQUFrQjtBQUFBLFVBQ2xCLFNBQVM7QUFBQSxVQUNULE9BQU87QUFBQSxZQUNMLEVBQUUsS0FBSyxtQkFBbUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFlBQzlELEVBQUUsS0FBSyxtQkFBbUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFlBQzlELEVBQUUsS0FBSyxtQkFBbUIsT0FBTyxXQUFXLE1BQU0sYUFBYSxTQUFTLGVBQWU7QUFBQSxVQUN6RjtBQUFBLFFBQ0Y7QUFBQSxNQUNGLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFBQSxJQUNUO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUCwrQkFBK0I7QUFBQSxRQUMvQixnQ0FBZ0M7QUFBQSxRQUNoQyxnQ0FBZ0M7QUFBQSxNQUNsQztBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLGVBQWUsRUFBRSxVQUFVLE1BQU07QUFBQSxNQUNqQyxlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsVUFDTixjQUFjLENBQUMsT0FBTztBQUNwQixnQkFBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLGtCQUFJLEdBQUcsU0FBUyxVQUFVLEVBQUcsUUFBTztBQUNwQyxrQkFBSSxHQUFHLFNBQVMsT0FBTyxLQUFLLEdBQUcsU0FBUyxXQUFXLEtBQUssR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQzVGLGtCQUFJLEdBQUcsU0FBUyxVQUFVLEtBQUssR0FBRyxTQUFTLGVBQWUsRUFBRyxRQUFPO0FBQ3BFLGtCQUFJLEdBQUcsU0FBUyxlQUFlLEVBQUcsUUFBTztBQUN6QyxrQkFBSSxHQUFHLFNBQVMsV0FBVyxLQUFLLEdBQUcsU0FBUywyQkFBMkIsRUFBRyxRQUFPO0FBQ2pGLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxtQkFBbUIsRUFBRyxRQUFPO0FBQzdDLGdCQUFJLEdBQUcsU0FBUyx3QkFBd0IsRUFBRyxRQUFPO0FBQ2xELGdCQUFJLEdBQUcsU0FBUyxzQkFBc0IsRUFBRyxRQUFPO0FBQ2hELGdCQUFJLEdBQUcsU0FBUywyQkFBMkIsRUFBRyxRQUFPO0FBQ3JELGdCQUFJLEdBQUcsU0FBUyxzQkFBc0IsRUFBRyxRQUFPO0FBQ2hELGdCQUFJLEdBQUcsU0FBUyx5QkFBeUIsRUFBRyxRQUFPO0FBQUEsVUFDckQ7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
