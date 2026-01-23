/* eslint-disable @typescript-eslint/no-explicit-any */
import { DiagramEngine, DiagramModel, LinkLayerFactory, NodeLayerFactory, NodeLayerModel } from '@projectstorm/react-diagrams';
import { ProjectInfo } from '../constants';
import { convertToOld } from '../serialiser/converter';
import { Dependency } from '../serialiser/interfaces';
import { loadPackage } from '../../components/blocks/common/factory';
import { getInitialPosition } from '../../components/blocks/common/factory';

export class ProjectManager {
    private activeModel: DiagramModel;
    private projectInfo: ProjectInfo;
    private onModelChangeListeners: ((model: DiagramModel) => void)[] = [];
    private engine: DiagramEngine;

    constructor(engine: DiagramEngine) {
        this.engine = engine;
        this.activeModel = new DiagramModel();
        this.projectInfo = {
            name: '',
            version: '1.0.0',
            description: '',
            author: '',
            image: '',
        };
        // Initialize with empty model
        this.engine.setModel(this.activeModel);
    }

    public getActiveModel(): DiagramModel {
        return this.activeModel;
    }

    public setActiveModel(model: DiagramModel) {
        this.activeModel = model;
        this.engine.setModel(this.activeModel);
        this.notifyListeners();
    }

    public getProjectInfo(): ProjectInfo {
        return this.projectInfo;
    }

    public setProjectInfo(info: ProjectInfo) {
        this.projectInfo = info;
    }

    public getName(): string {
        return this.projectInfo.name || 'Untitled';
    }

    public isLocked(): boolean {
        return this.activeModel.isLocked();
    }

    public setLocked(locked: boolean) {
        this.activeModel.setLocked(locked);
    }

    public addOnModelChange(callback: (model: DiagramModel) => void): () => void {
        this.onModelChangeListeners.push(callback);
        // Call it immediately for current model
        callback(this.activeModel);
        return () => {
            this.onModelChangeListeners = this.onModelChangeListeners.filter(cb => cb !== callback);
        };
    }

    public notifyListeners() {
        this.engine.repaintCanvas();
        this.onModelChangeListeners.forEach(cb => cb(this.activeModel));
    }

    public clearProject() {
        this.activeModel = new DiagramModel();
        this.projectInfo = {
            name: '',
            version: '1.0.0',
            description: '',
            author: '',
            image: '',
        };
        this.engine.setModel(this.activeModel);
        this.notifyListeners();
    }

    public loadProject(jsonModel: { editor: unknown; design: unknown; dependencies: Dependency; package: ProjectInfo }, filename: string = '') {
        const model = new DiagramModel();
        const editor = jsonModel.editor;
        console.log('[ProjectManager] Loading project...');

        if (editor && typeof editor === 'object') {
            model.deserializeModel(
                {
                    offsetX: 0,
                    offsetY: 0,
                    zoom: 100,
                    gridSize: 20,
                    layers: [],
                    id: '',
                    locked: false,
                    ...editor,
                },
                this.engine
            );

            // Self-healing layers
            if (model.getLayers().length === 0) {
                console.warn('[ProjectManager] Model has 0 layers! Forcing default layers...');
                const nodeLayer = new NodeLayerFactory().generateModel({});
                const linkLayer = new LinkLayerFactory().generateModel({});
                model.addLayer(linkLayer as any);
                model.addLayer(nodeLayer as any);
            }

            this.activeModel = model;
            this.projectInfo = jsonModel.package;
            if (!this.projectInfo.name && filename) {
                this.projectInfo.name = filename;
            }
        } else {
            console.warn('[ProjectManager] Editor data invalid, initializing empty project');
            this.activeModel = model;
            this.projectInfo = jsonModel.package || {
                name: filename || 'Untitled',
                version: '1.0.0',
                description: '',
                author: '',
                image: '',
            };
        }

        this.engine.setModel(this.activeModel);
        this.notifyListeners();
    }

    public serialise(aiConfig?: { apiKey: string, baseUrl: string, model: string }) {
        const data = convertToOld(this.activeModel, this.projectInfo);
        return {
            editor: this.activeModel.serialize(),
            aiConfig: aiConfig,
            ...data
        };
    }
    
    public addAsBlock(jsonModel: { editor: any; design: unknown; dependencies: Dependency; package: ProjectInfo }, fileName: string = '') {
         const block = loadPackage(jsonModel);
         if (block) {
             if (block.info.name === '' && fileName !== '') {
                 block.info.name = fileName;
             }
             block.setPosition(...getInitialPosition());
             this.activeModel.addNode(block);
             this.notifyListeners();
         }
    }
}
