"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyedMutexService = void 0;
const common_1 = require("@nestjs/common");
let KeyedMutexService = class KeyedMutexService {
    tails = new Map();
    async withLock(key, work) {
        const previous = this.tails.get(key) ?? Promise.resolve();
        let release;
        const current = new Promise((resolve) => {
            release = resolve;
        });
        const tail = previous.then(() => current);
        this.tails.set(key, tail);
        await previous;
        try {
            return await work();
        }
        finally {
            release();
            if (this.tails.get(key) === tail) {
                this.tails.delete(key);
            }
        }
    }
};
exports.KeyedMutexService = KeyedMutexService;
exports.KeyedMutexService = KeyedMutexService = __decorate([
    (0, common_1.Injectable)()
], KeyedMutexService);
//# sourceMappingURL=keyed-mutex.service.js.map