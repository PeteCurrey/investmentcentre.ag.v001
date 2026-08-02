"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const react_1 = __importDefault(require("react"));
require("./globals.css");
exports.metadata = {
    title: 'MERIDIAN — Master Intelligence Console',
    description: 'Private Institutional Investment Intelligence & Execution Terminal'
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <body>
        {children}
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map