import { type AgnosticNode } from './agnostic_node';

export interface AgnosticDebugOperations {
  stepIn: (node: AgnosticNode) => AgnosticNode | undefined;
  stepOver: (node: AgnosticNode) => AgnosticNode | undefined;
}
