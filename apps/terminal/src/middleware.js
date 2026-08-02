"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
function middleware(request) {
    // Allow all console routes and API endpoints to serve directly
    return server_1.NextResponse.next();
}
exports.config = {
    matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
//# sourceMappingURL=middleware.js.map