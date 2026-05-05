import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipmentTreeNode } from '../../pages/home/home.page';

@Component({
  selector: 'app-equipment-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './equipment-tree.component.html',
  styleUrl: './equipment-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTreeComponent {
  /** Root nodes of the tree */
  nodes = input<EquipmentTreeNode[]>([]);

  /** Whether to show expand/collapse all button */
  showExpandAll = input(true);

  /** Emit when a node is expanded (for lazy loading children) */
  nodeExpand = output<string>();

  /** Track which nodes are expanded */
  private _expandedNodes = signal<Set<string>>(new Set());

  isExpanded(nodeCode: string): boolean {
    return this._expandedNodes().has(nodeCode);
  }

  toggleNode(node: EquipmentTreeNode) {
    const code = node.code;
    const wasExpanded = this._expandedNodes().has(code);

    console.log('[EquipmentTree] toggleNode:', code, 'wasExpanded:', wasExpanded);

    this._expandedNodes.update((set) => {
      const newSet = new Set(set);
      if (wasExpanded) {
        newSet.delete(code);
      } else {
        newSet.add(code);
        // Emit expansion event for lazy loading
        console.log('[EquipmentTree] Emitting nodeExpand:', code);
        this.nodeExpand.emit(code);
      }
      return newSet;
    });
  }

  hasChildren(node: EquipmentTreeNode): boolean {
    // Siempre mostrar expand si hay array (aunque esté vacío)
    // La primera vez que se expande, dispara la carga de hijos
    return !!node.children;
  }

  expandAll() {
    const allCodes = this.collectAllCodes(this.nodes());
    this._expandedNodes.set(new Set(allCodes));
  }

  collapseAll() {
    this._expandedNodes.set(new Set());
  }

  private collectAllCodes(nodes: EquipmentTreeNode[]): string[] {
    const codes: string[] = [];
    for (const node of nodes) {
      codes.push(node.code);
      if (node.children) {
        codes.push(...this.collectAllCodes(node.children));
      }
    }
    return codes;
  }
}
