/* eslint-disable @typescript-eslint/no-explicit-any */
import createAiSettingsDialog from '../../components/dialogs/ai-settings-dialog';

export class AiManager {
    private apiKey: string = "";
    private baseUrl: string = "";
    private aiModel: string = "";
    private onConfigChangeListeners: (() => void)[] = [];

    constructor() {}

    public setConfig(apiKey: string, baseUrl: string, model: string) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.aiModel = model;
        this.notifyListeners();
    }

    public setApiKey(apiKey: string) {
        this.apiKey = apiKey;
        this.notifyListeners();
    }

    public setBaseUrl(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.notifyListeners();
    }

    public setAiModel(model: string) {
        this.aiModel = model;
        this.notifyListeners();
    }

    public getApiKey(): string {
        return this.apiKey;
    }

    public getBaseUrl(): string {
        return this.baseUrl;
    }

    public getAiModel(): string {
        return this.aiModel;
    }

    public addOnConfigChange(callback: () => void): () => void {
        this.onConfigChangeListeners.push(callback);
        return () => {
            this.onConfigChangeListeners = this.onConfigChangeListeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners() {
        this.onConfigChangeListeners.forEach(cb => cb());
    }

    public async editAiSettings(): Promise<void> {
        try {
            const data = await createAiSettingsDialog({
                isOpen: true,
                apiKey: this.apiKey,
                baseUrl: this.baseUrl,
                model: this.aiModel
            });

            if (data) {
                this.setConfig(data.apiKey, data.baseUrl, data.model);
                console.log('[AiManager] Settings updated');
            }
        } catch (error) {
            console.log('[AiManager] Settings dialog closed');
        }
    }

    public getConfig() {
        return {
            apiKey: this.apiKey,
            baseUrl: this.baseUrl,
            model: this.aiModel
        };
    }
}
