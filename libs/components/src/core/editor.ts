/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-labels */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable eqeqeq */
/* eslint-disable no-var */
/* eslint-disable prefer-const */
import { DeleteItemsAction } from '@projectstorm/react-canvas-core';
import createEngine, {
  DefaultLinkModel,
  DiagramEngine,
  DiagramModel,
  NodeModel,
  RightAngleLinkFactory,
  NodeLayerFactory,
  LinkLayerFactory,
  NodeLayerModel
} from '@projectstorm/react-diagrams';
import { CustomLinkFactory } from '../components/blocks/common/custom-link/custom-link-factory';
import { CodeBlockFactory } from '../components/blocks/basic/code/code-factory';
import { AiCodeBlockFactory } from '../components/blocks/basic/ai-code/code-factory';
import { ConstantBlockFactory } from '../components/blocks/basic/constant/constant-factory';
import { InputBlockFactory } from '../components/blocks/basic/input/input-factory';
import { OutputBlockFactory } from '../components/blocks/basic/output/output-factory';
import {
  BaseInputPortFactory,
  BaseOutputPortFactory,
  BaseParameterPortFactory,
} from '../components/blocks/common/base-port/port-factory';
import {
  createBlock,
  createBlockWithAPI,
  editBlock,
  getInitialPosition,
  createComposedBlock,
  editAIBlock,
} from '../components/blocks/common/factory';
import { PackageBlockFactory } from '../components/blocks/package/package-factory';
import { PackageBlockModel } from '../components/blocks/package/package-model';
import createProjectInfoDialog from '../components/dialogs/project-info-dialog';
import { ProjectInfo, BlockData } from './constants';
import BaseModel from '../components/blocks/common/base-model';
import createBlockDialog from '../components/dialogs/blocks-dialog';
import cloneDeep from 'lodash.clonedeep';
import { Dependency } from './serialiser/interfaces';
import { ProjectManager } from './managers/project-manager';
import { NavigationStack } from './managers/navigation-stack';
import { AiManager } from './managers/ai-manager';

declare module '@projectstorm/react-diagrams-core' {
  export interface PortModelOptions {
    label?: string;
  }
}

class Editor {
  private static instance: Editor;
  private static instanceComponent: Editor;
  
  private projectManager: ProjectManager;
  private navigationStack: NavigationStack;
  private aiManager: AiManager;

  private BlockData: BlockData;
  private stackOfBlock: { model: DiagramModel; info: ProjectInfo }[] = [];
  private blockCount: number = 0;

  public engine: DiagramEngine;

  private constructor() {
    // Do not register default delete action keyboard keys, because Backspace is also included in it.
    // Only Delete button is registered under register factories method.
    this.engine = createEngine({ registerDefaultDeleteItemsAction: false });
    
    // Initialize Managers
    this.projectManager = new ProjectManager(this.engine);
    this.navigationStack = new NavigationStack(this.projectManager, this.engine);
    this.aiManager = new AiManager();

    this.registerFactories();

    this.BlockData = {
      selectedInputIds: [],
      selectedOutputIds: [],
    };
  }

  /**
   * Register factories for different blocks and links
   */
  private registerFactories() {
    this.engine.getLinkFactories().registerFactory(new RightAngleLinkFactory());
    this.engine.getLinkFactories().registerFactory(new CustomLinkFactory()); // Register custom link factory to enable context menu
    this.engine.getPortFactories().registerFactory(new BaseInputPortFactory());
    this.engine.getPortFactories().registerFactory(new BaseOutputPortFactory());
    this.engine
      .getPortFactories()
      .registerFactory(new BaseParameterPortFactory());
    this.engine
      .getNodeFactories()
      .registerFactory(new ConstantBlockFactory(this));
    this.engine.getNodeFactories().registerFactory(new CodeBlockFactory(this));
    this.engine.getNodeFactories().registerFactory(new AiCodeBlockFactory(this));
    this.engine.getNodeFactories().registerFactory(new InputBlockFactory(this));
    this.engine
      .getNodeFactories()
      .registerFactory(new OutputBlockFactory(this));
    this.engine
      .getNodeFactories()
      .registerFactory(new PackageBlockFactory(this));

    // register an DeleteItemsAction with custom keyCodes (in this case, only Delete key)
    this.engine
      .getActionEventBus()
      .registerAction(new DeleteItemsAction({ keyCodes: [46, 8] }));
  }

  /**
   * Main entry point to get Editor object, since constructor is private.
   * @returns instance of Editor object
   */
  public static getInstance() {
    // Editor is used as a singleton across the whole application.
    if (!Editor.instance) {
      Editor.instance = new Editor();
    }
    return Editor.instance;
  }

  public static getForComponentInstance() {
    if (!Editor.instanceComponent) {
      Editor.instanceComponent = new Editor();
    }
    return Editor.instanceComponent;
  }

  public get activeModel() {
    return this.projectManager.getActiveModel();
  }

  // Delegate Config Changes to AiManager (or general config if expanded)
  public addOnConfigChange(callback: () => void): () => void {
    return this.aiManager.addOnConfigChange(callback);
  }

  /**
   * Deserialise the JSON object into model instance and open the project circuit.
   * @param jsonModel : JSON object conforming to the project structure
   */
  public loadProject(jsonModel: { editor: unknown; design: unknown; dependencies: Dependency; package: ProjectInfo; aiConfig?: { apiKey: string, baseUrl: string, model: string } }, filename: string = '') {
      // Load AI Config
      if (jsonModel.aiConfig) {
          this.setApiKey(jsonModel.aiConfig.apiKey);
          this.setBaseUrl(jsonModel.aiConfig.baseUrl);
          this.setAiModel(jsonModel.aiConfig.model);
      }
      this.projectManager.loadProject(jsonModel, filename);
  }

  public get projectInfoData(): ProjectInfo {
    return this.projectManager.getProjectInfo();
  }

  /**
   * Load an empty instance of DiagramModel as the current project.
   */
  public clearProject(): void {
    this.projectManager.clearProject();
    this.navigationStack.clearStack();
    this.aiManager.setConfig("", "", "");
  }

  public addOnModelChange(callback: (model: DiagramModel) => void): () => void {
    return this.projectManager.addOnModelChange(callback);
  }

  /**
   * Serialise the model data and also VisualCircuit data as required by backend.
   * @returns Serialised data of the project (model) and VisualCircuit (old) format data
   */
  public serialise() {
      return this.projectManager.serialise(this.aiManager.getConfig());
  }

  public async processBlock(
    model: DiagramModel,
    data: BlockData
  ): Promise<void> {
    // Process selected input IDs
    await Promise.all(
      data.selectedInputIds.map(async (id: string) => {
        const [blockid, name, linkID] = id.split(':');
        await this.addComposedBlock('basic.input', name, blockid);
      })
    );

    // Process selected output IDs
    await Promise.all(
      data.selectedOutputIds.map(async (id: string) => {
        const [blockid, name, linkID] = id.split(':');
        await this.addComposedBlock('basic.output', name, blockid);
      })
    );
  }

  public getNodeName(nodeType: string): string {
    if (nodeType === 'basic.input') {
      return 'Input';
    } else if (nodeType === 'basic.output') {
      return 'Output';
    } else if (nodeType === 'basic.constant') {
      return 'Parameter';
    } else if (nodeType === 'basic.code') {
      return 'Code';
    } else if (nodeType === 'basic.aicode') {
      return 'AI Code';
    }
    return nodeType;
  }

  public getGInputsOutput(): [
    { indexOne: number; label: string; id: string }[],
    { indexTwo: number; label: string; id: string }[]
  ] {
    let indexOne = 0;
    let indexTwo = 0;
    let valueOne: { indexOne: number; label: string; id: string }[] = [];
    let valueTwo: { indexTwo: number; label: string; id: string }[] = [];
    this.projectManager.getActiveModel().getNodes().forEach((node) => {
      if (node instanceof BaseModel) {
        var options = node.getOptions();
        var dataPorts = node.getPorts();
        Object.keys(dataPorts).forEach((portName) => {
          const port = dataPorts[portName];
          const portOptions = port.getOptions();
          const links = port.getLinks();
          var linkIds = Object.keys(links);
          if (portOptions.type == 'port.input') {
            if (linkIds.length == 0) {
              indexOne++;
              let label = ``;
              var id = `${options.id}:${portOptions.label}:${linkIds}`;
              if (node.getType() == 'block.package') {
                label = `${options.info.name} -> : ${portOptions.label}`;
              } else {
                label = `${this.getNodeName(node.getType())} -> : ${portOptions.label
                  }`;
              }
              valueOne.push({ indexOne, label, id });
            }
          } else if (portOptions.type == 'port.output') {
            indexTwo++;
            let label = ``;
            var id = `${options.id}:${portOptions.label}:${linkIds}`;
            if (node.getType() == 'block.package') {
              label = `${options.info.name} -> : ${portOptions.label}`;
            } else {
              label = `${this.getNodeName(node.getType())} -> : ${portOptions.label
                }`;
            }
            valueTwo.push({ indexTwo, label, id });
          }
        });
      }
    });
    return [valueOne, valueTwo];
  }

  /**
   * Callback for the 'Edit Block' button in menu.
   * Opens a dialog box and saves the data entered to Block variable.
   */
  public async editBlock(): Promise<Boolean> {
    try {
      // Create deep copies using lodash.cloneDeep
      const activeModelCopy = cloneDeep(this.projectManager.getActiveModel());
      const projectInfoCopy = cloneDeep(this.projectManager.getProjectInfo());

      // Push the deep copies onto the stack
      this.stackOfBlock.push({ model: activeModelCopy, info: projectInfoCopy });

      // Open the block dialog and await the result
      const data = await createBlockDialog({
        isOpen: true,
        getGInputsOutput: this.getGInputsOutput.bind(this),
      });
      this.BlockData = data;

      // Process the block data
      await this.processBlock(this.projectManager.getActiveModel(), data);
      console.log('Block editing completed successfully.');
      return true;
    } catch (error) {
      console.error('Error in editBlock:', error);
      console.log('Block dialog closed');
      return false;
    }
  }

  public retriveCircuit() {
    if (this.stackOfBlock.length) {
      const { model, info } = this.stackOfBlock.pop()!;
      this.projectManager.setActiveModel(model);
      this.projectManager.setProjectInfo(info);
    }
  }

  public getName(): string {
    return this.projectManager.getName();
  }

  /**
   * Add the given type of block to the current project / model.
   * @param name : Name / type of the block to add to model.
   */
  public async addBlock(name: string): Promise<void> {
    console.log(`Editor.addBlock called for ${name}`);
    this.blockCount += 1;
    const block = await createBlock(name, this.blockCount);

    if (block) {
      const activeModel = this.projectManager.getActiveModel();
      // Self-healing: Ensure layers exist
      let nodeLayer = activeModel.getLayers().find(l => l instanceof NodeLayerModel);

      if (!nodeLayer) {
        nodeLayer = new NodeLayerFactory().generateModel({}) as any;
        if (activeModel.getLayers().length === 0) {
          const linkLayer = new LinkLayerFactory().generateModel({});
          activeModel.addLayer(linkLayer as any);
          activeModel.addLayer(nodeLayer as any);
        } else {
          activeModel.addLayer(nodeLayer as any);
        }
      }

      block.setPosition(...getInitialPosition());
      if (nodeLayer instanceof NodeLayerModel) {
        nodeLayer.addModel(block);
      }
      this.projectManager.notifyListeners();
    }
  }

  public async addBlockWithAPI(name: string, data: any): Promise<void> {
    this.blockCount += 1;
    const block = await createBlockWithAPI(name, this.blockCount, data);
    if (block) {
      const activeModel = this.projectManager.getActiveModel();
      if (activeModel.getLayers().length === 0) {
         const nodeLayer = new NodeLayerFactory().generateModel({});
         const linkLayer = new LinkLayerFactory().generateModel({});
         activeModel.addLayer(linkLayer as any);
         activeModel.addLayer(nodeLayer as any);
      }
      block.setPosition(...getInitialPosition());
      activeModel.addNode(block);
      this.projectManager.notifyListeners();
    }
  }

  public nullLinkNodes(type: string, name: string, blockID: string) {
    const nodes = this.projectManager.getActiveModel().getNodes();
    for (const node of Object.values(nodes)) {
      const ports = node.getPorts();
      for (const port of Object.values(ports)) {
        if (port.getOptions().label === name && node.getID() === blockID) {
          const link = new DefaultLinkModel();
          if (port.getType() == 'port.input') {
            link.setTargetPort(port);
            this.projectManager.getActiveModel().addLink(link);
            return link.getID();
          } else if (port.getType() == 'port.output') {
            link.setSourcePort(port);
            this.projectManager.getActiveModel().addLink(link);
            return link.getID();
          }
        }
      }
    }
    return '';
  }

  public async addComposedBlock(
    type: string,
    name: string,
    blockID: string
  ): Promise<void> {
    this.blockCount += 1;
    const linkID = this.nullLinkNodes(type, name, blockID);
    const block = await createComposedBlock(type, name);
    if (block) {
      block.setPosition(...getInitialPosition());
      this.projectManager.getActiveModel().addNode(block);
      this.engine.repaintCanvas();

      const link = this.projectManager.getActiveModel().getLink(linkID);
      if (link) {
          const newPort = block.getPort();
          if (newPort) {
              if (type == 'basic.input') {
                  link.setSourcePort(newPort);
              } else if (type == 'basic.output') {
                  link.setTargetPort(newPort);
              }
              this.engine.repaintCanvas();
          }
      }
    }
  }

  public async editSaveInfoProject(
    saveProjectInfo: ProjectInfo
  ): Promise<void> {
    this.projectManager.setProjectInfo(saveProjectInfo);
    this.projectManager.notifyListeners();
  }

  public async editProjectInfo(): Promise<void> {
    createProjectInfoDialog({ isOpen: true, ...this.projectManager.getProjectInfo() })
      .then((data) => {
        this.projectManager.setProjectInfo(data);
      })
      .catch(() => {
        console.log('Project Info dialog closed');
      });
  }

  public addAsBlock(jsonModel: { editor: Editor; design: unknown; dependencies: Dependency; package: ProjectInfo }, fileName: string = '') {
      this.projectManager.addAsBlock(jsonModel, fileName);
  }

  public setAiModel(model: string) {
    this.aiManager.setAiModel(model);
  }

  public getAiModel(): string {
    return this.aiManager.getAiModel();
  }

  public setApiKey(apiKey: string) {
    this.aiManager.setApiKey(apiKey);
  }

  public setBaseUrl(baseUrl: string) {
    this.aiManager.setBaseUrl(baseUrl);
  }

  public getApiKey(): string {
    return this.aiManager.getApiKey();
  }

  public getBaseUrl(): string {
    return this.aiManager.getBaseUrl();
  }

  public openPackage(node: PackageBlockModel) {
      this.navigationStack.openPackage(node);
  }

  public showingPackage() {
    return this.navigationStack.showingPackage();
  }

  public locked(): boolean {
    return this.projectManager.isLocked();
  }

  public setLock(lock: boolean) {
    this.projectManager.setLocked(lock);
  }

  public goToPreviousModel() {
      this.navigationStack.goToPreviousModel();
  }

  public removeNode(node: NodeModel) {
    if (!this.locked()) {
      node.remove();
      this.engine.repaintCanvas();
    }
  }

  public async editNode<T extends NodeModel>(node: T) {
    if (!this.locked()) {
      await editBlock(node);
      this.engine.repaintCanvas();
    }
  }

  public async editAINode<T extends NodeModel>(node: T) {
    if (!this.locked()) {
      let data: any = await editAIBlock(node);
      this.engine.repaintCanvas();
      return data;
    }
  }

  public async editAiSettings(): Promise<void> {
      await this.aiManager.editAiSettings();
  }
}

export default Editor;
