"use strict";
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1751
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = void 0;
const index_js_1 = require("../helpers/index.js");
const meta = __importStar(require("./generated-meta.js"));
exports.rule = {
    meta: (0, index_js_1.generateMeta)(meta, {
        messages: {
            refactorLoop: 'Refactor this loop to do more than one iteration.',
        },
    }),
    // @ts-ignore The typings of @typescript-eslint/utils does not contain the 'onX' methods.
    create(context) {
        const loopingNodes = new Set();
        const loops = new Set();
        const loopsAndTheirSegments = [];
        const codePathSegments = [];
        let currentCodePathSegments = [];
        return {
            ForStatement(node) {
                loops.add(node);
            },
            WhileStatement(node) {
                loops.add(node);
            },
            DoWhileStatement(node) {
                loops.add(node);
            },
            onCodePathStart() {
                codePathSegments.push(currentCodePathSegments);
                currentCodePathSegments = [];
            },
            onCodePathSegmentStart(segment) {
                currentCodePathSegments.push(segment);
            },
            onCodePathSegmentEnd() {
                currentCodePathSegments.pop();
            },
            onCodePathEnd() {
                currentCodePathSegments = codePathSegments.pop();
            },
            'WhileStatement > *'(node) {
                visitLoopChild(node.parent);
            },
            'ForStatement > *'(node) {
                visitLoopChild(node.parent);
            },
            onCodePathSegmentLoop(_, toSegment, node) {
                if (node.type === 'ContinueStatement') {
                    loopsAndTheirSegments.forEach(({ segments, loop }) => {
                        if (segments.includes(toSegment)) {
                            loopingNodes.add(loop);
                        }
                    });
                }
                else {
                    loopingNodes.add(node);
                }
            },
            'Program:exit'() {
                loops.forEach(loop => {
                    if (!loopingNodes.has(loop)) {
                        context.report({
                            messageId: 'refactorLoop',
                            loc: context.sourceCode.getFirstToken(loop).loc,
                        });
                    }
                });
            },
        };
        // Required to correctly process "continue" looping.
        // When a loop has a "continue" statement, this "continue" statement triggers a "onCodePathSegmentLoop" event,
        // and the corresponding event node is that "continue" statement. Current implementation is based on the fact
        // that the "onCodePathSegmentLoop" event is triggered with a loop node. To work this special case around,
        // we visit loop children and collect corresponding path segments as these segments are "toSegment"
        // in "onCodePathSegmentLoop" event.
        function visitLoopChild(parent) {
            if (currentCodePathSegments.length > 0) {
                loopsAndTheirSegments.push({ segments: [...currentCodePathSegments], loop: parent });
            }
        }
    },
};
