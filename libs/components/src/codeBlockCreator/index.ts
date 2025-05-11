import OpenAI from 'openai';
import { AiCodeBlockModel, CodeBlockData, AiCodeBlockModelOptions } from "../components/blocks/basic/ai-code/code-model"


export default class CodeBlockCreatorAI {


    openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: "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",
        defaultHeaders: {

            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },

        // baseURL: 'http://localhost:11434/v1',
        // apiKey: 'ollama', // required but unused
        dangerouslyAllowBrowser: true,
    });
    codeBlockModel: AiCodeBlockModel | undefined;
    constructor(parameters: AiCodeBlockModelOptions, codeBlockModel?: AiCodeBlockModel) {
        this.codeBlockModel = codeBlockModel;

    }
    SYSTEM_PROMPT_CODE_BLOCK: string = `
    You are an expert assistant in Python programming for an Offboard Studio. Your task is to generate Python code that follows these guidelines:
    
    - **Clean and Readable Code**: Ensure the code is clear, well-structured, and includes necessary comments.
    - **PEP8 Standards**: Use meaningful variable names and proper indentation.
    - **Optimized for Efficiency**: Avoid unnecessary computations and use best practices for performance.
    - **Secure Code**: Validate user inputs and prevent security vulnerabilities.
    - **Modular Structure**: Organize functions and classes for reusability.
    - **Error Handling**: Use \`try-except\` blocks to manage potential errors.
    - **Documentation**: Use docstrings to explain functions and classes.
    - **Testability**: Ensure the code can be easily tested.
    - **Block Programming Based**: Use \`main(inputs, outputs, parameters, synchronise)\` instead of \`if __name__ == "__main__":\`.
    - **Type Hints**: Use type hints for better clarity.
    - **F-Strings for String Formatting**: Use f-strings for better readability and performance.
    - **List Comprehensions**: Use list comprehensions where appropriate for cleaner and more efficient code.
    - **No Plotting or Displaying Windows**: Do not use \`cv2.imshow\` or similar functions.
    - **Always read from image from this inputs.read_image("Img")
    - **Always write to image from this outputs.share_image("OutImage", img)**
    - **Always write to array from this outputs.share_array("OutArray", data)**
    - **Always read from array from this inputs.read_array("InArray")**
    - **Always read from number from this inputs.read_number("InNumber")**
    - **Always write to number from this outputs.share_number("OutNumber", data)**
    - **Always read from string from this inputs.read_string("InString")**
    - **Always write to string from this outputs.share_string("OutString", data)**
    - **Always assign to a variable from enable and read it more than once, do not use it like this: try: enable = inputs.read_number("Enable") except Exception: auto_enable = True**
    
    ### Example 1: Blur Code
    
    \`\`\`python
    import cv2
    import numpy as np
    from lib.utils import Synchronise
    from lib.inputs import Inputs
    from lib.outputs import Outputs
    from lib.parameters import Parameters

    def main(inputs:Inputs, outputs:Outputs, parameters:Parameters, synchronise:Synchronise):
        blur_type = parameters.read_string("BlurType")
        kernel = tuple([int(x.strip()) for x in parameters.read_string("Kernel").split(',')])
        auto_enable = False
        try:
            enable = inputs.read_number("Enable")
        except Exception:
            auto_enable = True
    
        while(auto_enable or inputs.read_number('Enable')):
            frame = inputs.read_image("Img")
            if frame is None:
                continue
    
            if blur_type == 'Gaussian':
                blurred_img = cv2.GaussianBlur(frame, kernel, 0)
            elif blur_type == 'Averaging':
                blurred_img = cv2.blur(frame, kernel)
            elif blur_type == 'Median':
                blurred_img = cv2.medianBlur(frame, kernel[0])
    
            outputs.share_image('Out', blurred_img)
            synchronise()
    \`\`\`
    
    ### Example 2: Object Detection
    
    \`\`\`python
    import cv2
    import numpy as np
    import time
    
    className = []
    classesFile = 'utils/models/yolov3/yolov3.txt'
    
    with open(classesFile,'rt') as f:
        className = f.read().rstrip('\\n').split('\\n')
    
    def findObjects(outputs, img):
        confThreshold = 0.3
        nmsThreshold = 0.3
        hT, wT, cT = img.shape
        bbox = []
        classIds = []
        confs = []
    
        for output in outputs:
            for det in output:
                scores = det[5:]
                classId = np.argmax(scores)
                confidence = scores[classId]
                if confidence > confThreshold:
                    w,h = int(det[2] * wT), int(det[3] * hT)
                    x,y = int((det[0]*wT) - w/2), int((det[1]*hT) - h/2)
                    bbox.append([x,y,w,h])
                    classIds.append(classId)
                    confs.append(float(confidence))
    
        indices = cv2.dnn.NMSBoxes(bbox, confs, confThreshold, nmsThreshold)
        
        for i in range(len(indices)):
            box = bbox[i]
            x,y,w,h = box[0],box[1],box[2],box[3]
            cv2.rectangle(img,(x,y),(x+w, y+h),(255,0,255),2)
            cv2.putText(img,f'{className[classIds[i]].upper()} {int(confs[i]*100)}%',
                        (x,y-10),cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,0,255),2)
    
                "from lib.utils import Synchronise",
    
    from lib.utils import Synchronise
    from lib.inputs import Inputs
    from lib.outputs import Outputs
    from lib.parameters import Parameters

    def main(inputs:Inputs, outputs:Outputs, parameters:Parameters, synchronise:Synchronise):
        auto_enable = true
        try:
            enable = inputs.read_number("Enable")
        except Exception:
            auto_enable = true
        
        whT = 320
    
        modelConfiguration = 'utils/models/yolov3/yolov3-tiny.cfg'
        modelWeights = 'utils/models/yolov3/yolov3-tiny.weights'
    
        net = cv2.dnn.readNetFromDarknet(modelConfiguration,modelWeights)
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
    
        while(auto_enable or inputs.read_number('Enable')):
            frame = inputs.read_image("Img")
            
            if frame is None:
                continue
    
            blob = cv2.dnn.blobFromImage(frame, 1/255,(whT,whT),[0,0,0],1, crop = false)
            net.setInput(blob)
    
            layerNames = net.getLayerNames()
            outputNames = []
            outLayers = net.getUnconnectedOutLayers()
            
            for i in range(len(outLayers)):
                for j in range(len(outLayers[i])):
                    outputNames.append(layerNames[outLayers[i][j] - 1])
    
            results = net.forward(outputNames)
            findObjects(results,frame)
    
            outputs.share_image("Out", frame)
    \`\`\`
    
    ### Example 3: PID Controller
    
    \`\`\`python
    import numpy as np
    import math
    from time import sleep
    
    from lib.utils import Synchronise
    from lib.inputs import Inputs
    from lib.outputs import Outputs
    from lib.parameters import Parameters

    def main(inputs:Inputs, outputs:Outputs, parameters:Parameters, synchronise:Synchronise):
        auto_enable = true
        try:
            enable = inputs.read_number("Enable")
        except Exception:
            auto_enable = true
    
        kp = parameters.read_number("Kp")
        ki = parameters.read_number("Ki")
        kd = parameters.read_number("Kd")
    
        previousError, I = 0, 0
    
        while(auto_enable or inputs.read_number('Enable')):
            msg = inputs.read_number("Inp")
            if msg is None:
                continue
    
            error = float(msg)
            sleep(0.01)
    
            P = error
            I = I + error
            D = error - previousError
            PIDvalue = (kp*P) + (ki*I) + (kd*D)
            previousError = error
    
            linear_velocity = 5.0
            angular_velocity = -PIDvalue
    
            data = [linear_velocity, angular_velocity]
            outputs.share_array("Out", data)
            synchronise()
    \`\`\`
    
    ---
    
    Your goal is to use the above examples to generate high-quality Python code adhering to best practices that will help the user learn the correct approach to Python programming.
    `;

    /**
     * Generates a code block using the Together API.
     * @param {CodeBlockData} block The data for the code block.
     * @returns {Promise<string>} The generated code block.
     */


    public async generateCodeBlock(block: CodeBlockData): Promise<string> {

        const response = await this.openai.chat.completions.create({
            messages: [
                { role: "system", content: this.SYSTEM_PROMPT_CODE_BLOCK },
                {
                    role: "user",
                    content:
                        "Generate description for the following : " +
                        this.codeBlockModel?.getData().aiDescription +
                        " generate previous code from this can follow : " +
                        this.codeBlockModel?.getData().code
                    // ||
                    // "Generate code python for the following inputs and outputs: " +
                    // JSON.stringify(this.codeBlockModel?.getData()?.ports?.in || []) +
                    // " and " +
                    // JSON.stringify(this.codeBlockModel?.getData()?.ports?.out || []),
                },
            ],
            model: "deepseek/deepseek-r1-zero:free",
            // model: "deepseek-r1:14b",
        });

        const code = response?.choices?.[0]?.message?.content;
        if (!code) {
            throw new Error("AI did not return any code content. Full response: " + JSON.stringify(response));
        }


        console.log(code);
        return code;
    }

}