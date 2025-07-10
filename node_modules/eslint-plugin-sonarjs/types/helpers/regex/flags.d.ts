import estree from 'estree';
import type { Rule } from 'eslint';
export declare function getFlags(callExpr: estree.CallExpression, context?: Rule.RuleContext): string | null;
