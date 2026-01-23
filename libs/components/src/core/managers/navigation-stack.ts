/* eslint-disable @typescript-eslint/no-explicit-any */
import { DiagramEngine, DiagramModel } from '@projectstorm/react-diagrams';
import { ProjectInfo } from '../constants';
import { PackageBlockModel } from '../../components/blocks/package/package-model';
import { ProjectManager } from './project-manager';
import { convertToOld } from '../serialiser/converter';

interface StackItem {
    model: DiagramModel;
    info: ProjectInfo;
    node: PackageBlockModel;
}

export class NavigationStack {
    private stack: StackItem[] = [];
    private projectManager: ProjectManager;
    private engine: DiagramEngine;

    constructor(projectManager: ProjectManager, engine: DiagramEngine) {
        this.projectManager = projectManager;
        this.engine = engine;
    }

    public openPackage(node: PackageBlockModel) {
        const currentModel = this.projectManager.getActiveModel();
        const currentInfo = this.projectManager.getProjectInfo();

        this.stack.push({
            model: currentModel,
            info: currentInfo,
            node: node,
        });

        console.log('[NavigationStack] openPackage: Pushed to stack. New length:', this.stack.length);

        const model = new DiagramModel();
        const editorData = node.model;

        if (editorData) {
            model.deserializeModel(
                {
                    offsetX: 0,
                    offsetY: 0,
                    zoom: 100,
                    gridSize: 20,
                    layers: [],
                    id: '',
                    locked: false,
                    ...editorData,
                },
                this.engine
            );

            this.projectManager.setProjectInfo(node.info);
            this.projectManager.setActiveModel(model);
            this.projectManager.setLocked(true); // Lock inner packages by default
        }
    }

    public goToPreviousModel() {
        if (this.stack.length === 0) return;

        const currentModel = this.projectManager.getActiveModel();
        const currentInfo = this.projectManager.getProjectInfo();
        
        // Serialize current state to save back to the node
        const data = convertToOld(currentModel, currentInfo);

        const { model: parentModel, info: parentInfo, node } = this.stack.pop()!;
        
        console.log('[NavigationStack] goToPreviousModel: Popped from stack. Remaining:', this.stack.length);

        // Update the package node with the modified inner circuit
        node.design = data.design;
        node.model = currentModel.serialize();

        // Restore parent context
        this.projectManager.setProjectInfo(parentInfo);
        this.projectManager.setActiveModel(parentModel);
        this.projectManager.setLocked(false);
    }

    public showingPackage(): boolean {
        return this.stack.length > 0;
    }

    public clearStack() {
        this.stack = [];
    }
}
