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
} from '@projectstorm/react-diagrams';
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
  editBlock,
  getInitialPosition,
  loadPackage,
  createComposedBlock,
  editAIBlock,
} from '../components/blocks/common/factory';
import { PackageBlockFactory } from '../components/blocks/package/package-factory';
import { PackageBlockModel } from '../components/blocks/package/package-model';
import createProjectInfoDialog from '../components/dialogs/project-info-dialog';
import { ProjectInfo, BlockData } from './constants';
import { convertToOld } from './serialiser/converter';
import BaseModel from '../components/blocks/common/base-model';
import { count } from 'console';
import createBlockDialog from '../components/dialogs/blocks-dialog';
import cloneDeep from 'lodash.clonedeep';
import { PortModelOptions } from '@projectstorm/react-diagrams-core';
import { Dependency } from './serialiser/interfaces';

declare module '@projectstorm/react-diagrams-core' {
  export interface PortModelOptions {
    label?: string;
  }
}

class Editor {
  private static instance: Editor;
  private static instanceComponent: Editor;
  private currentProjectName: string;
  private projectInfo: ProjectInfo;
  private BlockData: BlockData;
  private apiKey: string;
  private aiModel: string;
  private baseUrl: string;

  private stack: {
    model: DiagramModel;
    info: ProjectInfo;
    node: PackageBlockModel;
  }[];
  private stackOfBlock: { model: DiagramModel; info: ProjectInfo }[];
  private activeModel: DiagramModel;
  private blockCount: number = 0;

  public engine: DiagramEngine;

  private constructor() {
    // Name of the project. Used as file name while downloading.
    this.currentProjectName = 'Untitled';
    // Do not register default delete action keyboard keys, because Backspace is also included in it.
    // Only Delete button is registered under register factories method.
    this.engine = createEngine({ registerDefaultDeleteItemsAction: false });
    this.activeModel = new DiagramModel();
    // Use an array as stack, to keep track of levels of circuit model.
    this.stack = [];
    this.stackOfBlock = [];
    this.engine.setModel(this.activeModel);
    this.registerFactories();
    this.apiKey = "";
    this.baseUrl = "";
    this.aiModel = "";
    this.projectInfo = {
      name: '',
      version: '',
      description: '',
      author: '',
      image: '',
    };
    this.BlockData = {
      selectedInputIds: [],
      selectedOutputIds: [],
    };
  }

  /**
   * Register factories for different blocks and links
   */
  private registerFactories() {
    // RightAngle links is not used as of now. Its for future when links might be converted to straight wires
    this.engine.getLinkFactories().registerFactory(new RightAngleLinkFactory());
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
      .registerAction(new DeleteItemsAction({ keyCodes: [46] }));
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
    // Editor is used as a singleton across the whole application.

    if (!Editor.instanceComponent) {
      Editor.instanceComponent = new Editor();
    }
    return Editor.instanceComponent;
  }

  /**
   * Deserialise the JSON object into model instance and open the project circuit.
   * @param jsonModel : JSON object conforming to the project structure
   * Project Structure: {
   *      "editor": {...},
   *      "version": "3.0",
   *      "package": {...},
   *      "design": {...},
   *      "dependencies": {...}
   * }
   */
  public loadProject(jsonModel: { editor: unknown; design: unknown; dependencies: Dependency; package: ProjectInfo }, filename: string = '') {
    const model = new DiagramModel();
    const editor = jsonModel.editor;
    console.log('Loading project with model:', editor);
    if (editor) {
      console.log('Deserialising model with editor data:', editor);
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
      this.activeModel = model;
      this.projectInfo = jsonModel.package;
      if (this.projectInfo.name === '' && filename !== '') {
        this.projectInfo.name = filename;
      }
      console.log('Loaded project info:', this.projectInfo);
      // Set the current project name to the name of
      this.engine.setModel(model);
    }
  }

  public get projectInfoData(): ProjectInfo {
    return this.projectInfo;
  }

  /**
   * Load an empty instance of DiagramModel as the current project.
   */
  public clearProject(): void {
    this.activeModel = new DiagramModel();
    this.projectInfo = {
      name: '',
      version: '',
      description: '',
      author: '',
      image: '',
    };
    this.engine.setModel(this.activeModel);
  }

  /**
   * Serialise the model data and also VisualCircuit data as required by backend.
   * Project Structure: {
   *      "editor": {...},
   *      "version": "3.0",
   *      "package": {...},
   *      "design": {...},
   *      "dependencies": {...}
   * }
   * @returns Serialised data of the project (model) and VisualCircuit (old) format data
   */
  public serialise() {
    const data = convertToOld(this.activeModel, this.projectInfo);
    return { editor: this.activeModel.serialize(), ...data };
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
    this.activeModel.getNodes().forEach((node) => {
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
      const activeModelCopy = cloneDeep(this.activeModel);
      const projectInfoCopy = cloneDeep(this.projectInfo);

      // Push the deep copies onto the stack
      this.stackOfBlock.push({ model: activeModelCopy, info: projectInfoCopy });

      // Open the block dialog and await the result
      const data = await createBlockDialog({
        isOpen: true,
        getGInputsOutput: this.getGInputsOutput.bind(this),
      });
      this.BlockData = data;

      // Process the block data
      await this.processBlock(this.activeModel, data);
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
      this.activeModel = model;
      this.projectInfo = info;
      this.engine.setModel(this.activeModel);
      this.engine.repaintCanvas();
    }
  }

  /**
   * Getter for Project Name
   * @returns Project name
   */
  public getName(): string {
    if (this.projectInfo.name) {
      this.currentProjectName = this.projectInfo.name;
    }
    return this.currentProjectName;
  }

  /**
   * Add the given type of block to the current project / model.
   * @param name : Name / type of the block to add to model.
   */
  public async addBlock(name: string): Promise<void> {
    this.blockCount += 1;
    const block = await createBlock(name, this.blockCount);

    if (block) {
      // Get a default position and set it as blocks position
      // TODO: Better way would be to get an empty position dynamically or track mouse's current position.
      block.setPosition(...getInitialPosition());
      this.activeModel.addNode(block);
      // Once the block is added, the page has to rendered again, this is done by repainting the canvas.
      this.engine.repaintCanvas();
    }
  }

  public nullLinkNodes(type: string, name: string, blockID: string) {
    // Get all nodes from the model
    const nodes = this.activeModel.getNodes();

    // Iterate over each node
    for (const node of Object.values(nodes)) {
      // Get all ports from the current node
      const ports = node.getPorts();

      // Iterate over each port to check if the name matches the given port name
      for (const port of Object.values(ports)) {
        if (port.getOptions().label === name && node.getID() === blockID) {
          const link = new DefaultLinkModel();
          if (port.getType() == 'port.input') {
            link.setTargetPort(port);
            this.activeModel.addLink(link);
            return link.getID();
          } else if (port.getType() == 'port.output') {
            link.setSourcePort(port);
            this.activeModel.addLink(link);
            return link.getID();
          }
        }
      }
    }

    // Return null if no matching port is found
    return '';
  }

  /**
   * Add the given type of block for composed.
   * @param name : Name / type of the block to add to model.
   */
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
      this.activeModel.addNode(block);
      this.engine.repaintCanvas();

      const link = this.activeModel.getLink(linkID);
      if (!link) {
        console.error('Link not found');
        return;
      }

      const newPort = block.getPort();
      if (!newPort) {
        console.error('New source port not found');
        return;
      }

      if (type == 'basic.input') {
        link.setSourcePort(newPort);
      } else if (type == 'basic.output') {
        link.setTargetPort(newPort);
      }

      this.engine.repaintCanvas();
    }
  }



  public async editSaveInfoProject(
    saveProjectInfo: ProjectInfo
  ): Promise<void> {
    this.projectInfo = saveProjectInfo;
  }

  /**
   * Callback for the 'Edit Project Information' button in menu.
   * Opens a dialog box and saves the data entered to projectInfo variable.
   */
  public async editProjectInfo(): Promise<void> {
    // Helper to open Project Info dialog box
    createProjectInfoDialog({ isOpen: true, ...this.projectInfo })
      .then((data) => {
        this.projectInfo = data;
      })
      .catch(() => {
        console.log('Project Info dialog closed');
      });
  }

  /**
   * Adds a project as a block to the current project
   * @param jsonModel JSON object conforming to the project structure
   * Project Structure: {
   *      "editor": {...},
   *      "version": "3.0",
   *      "package": {...},
   *      "design": {...},
   *      "dependencies": {...}
   * }
   */
  public addAsBlock(jsonModel: { editor: Editor; design: unknown; dependencies: Dependency; package: ProjectInfo }, fileName: string = '') {
    // Helper to convert JSON object to block.
    const block = loadPackage(jsonModel);
    // Get a default position and set it as blocks position
    // TODO: Better way would be to get an empty position dynamically or track mouse's current position.
    if (block) {
      if (block.info.name === '' && fileName !== '') {
        block.info.name = fileName;
      }
      block.setPosition(...getInitialPosition());
      this.activeModel.addNode(block);
      // Once the block is added, the page has to rendered again, this is done by repainting the canvas.
      this.engine.repaintCanvas();
    }
  }

  public setAiModel(model: string) {
    this.aiModel = model;
  }

  public getAiModel(): string {
    return this.aiModel;
  }

  public setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  public setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Open a block as current project (model)
   * @param node Block to be opened
   */
  public openPackage(node: PackageBlockModel) {
    // Store the current project (model), project info and the block asked to open in stack,
    // so that it can be restored later.
    this.stack.push({
      model: this.activeModel,
      info: this.projectInfo,
      node: node,
    });
    // Create a new model and deserialise the block into it.
    const model = new DiagramModel();
    const editor = node.model;
    if (editor) {
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
      this.activeModel = model;
      this.projectInfo = node.info;
      // Set the block as the current project (model)
      this.engine.setModel(model);
      // By default lock the project
      this.setLock(true);
    }
  }

  /**
   * Check whether currently any package block is opened.
   * @returns True if there is a model in the stack.
   */
  public showingPackage() {
    return this.stack.length > 0;
  }

  /**
   * Get status of model lock
   * @returns Whether the current project (model) is locked from any editing
   */
  public locked(): boolean {
    return this.activeModel.isLocked();
  }

  /**
   * Set the status of model lock
   * @param lock True if project (model) has to be locked.
   */
  public setLock(lock: boolean) {
    this.activeModel.setLocked(lock);
  }

  /**
   * Go one level higher in the model stack.
   * When back button is pressed while viewing/editing a model, the current project is changed to its
   * parent model.
   */
  public goToPreviousModel() {
    // Check if there is anything in the stack
    if (this.stack.length) {
      // Since the model could have changed, get new data for backend.
      const data = convertToOld(this.activeModel, this.projectInfo);
      // Get the parent model, project info and the current block being modified from the stack
      const { model, info, node } = this.stack.pop()!;
      // Assign the modified data to the stored block object, as this is the one used in project.
      node.design = data.design;
      node.model = this.activeModel.serialize();
      this.activeModel = model;
      this.projectInfo = info;
      // Change the current model to the model got from the stack.
      this.engine.setModel(this.activeModel);

      this.setLock(false);
    }
  }


  /**
   * Delete a block node, if current model is not locked.
   * @param node
   */
  public removeNode(node: NodeModel) {
    if (!this.locked()) {
      node.remove();
      this.engine.repaintCanvas();
    }
  }

  /**
  * Edit a block node, if current model is not locked.
  * @param node
  */
  public async editNode<T extends NodeModel>(node: T) {
    if (!this.locked()) {
      await editBlock(node);

      this.engine.repaintCanvas();
      // return data;
    }
  }

  /**
   * Edit a AI block node, if current model is not locked.
   * @param node
   */
  public async editAINode<T extends NodeModel>(node: T) {
    if (!this.locked()) {
      let data: any = await editAIBlock(node);

      this.engine.repaintCanvas();
      return data;
    }
  }
}

export default Editor;
