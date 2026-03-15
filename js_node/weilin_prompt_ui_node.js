import { app } from '../../scripts/app.js'
// 提示词 Node

// localStorage.setItem("weilin_prompt_ui_onfirst", 0);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let localLanguage = "打开提示词编辑器"
let localOpenLoraLanguage = "打开Lora堆"

function getBrowserLanguage() {
  // 获取浏览器语言
  const language = navigator.language || navigator.userLanguage;
  // 判断语言类型
  if (language.startsWith('zh')) {
    localLanguage = "打开提示词编辑器"
    localOpenLoraLanguage = "打开Lora堆"
  } else if (language.startsWith('en')) {
    localLanguage = "Open Prompt UI"
    localOpenLoraLanguage = "Open Lora Stack"
  } else {
    localLanguage = "Open Prompt UI"
    localOpenLoraLanguage = "Open Lora Stack"
  }
}

let globalNodeList = []

let global_randomID = generateUUID(); // 随机种子ID

function updateNodeTitleBySeed(seed, newTitle) {
  // 使用 find 方法查找目标节点
  const targetNode = globalNodeList.find(node => node.seed === seed);
  if (targetNode) {
    // 如果找到目标节点，修改其 title
    targetNode.title = newTitle;
  }
}

function updateNodeIdBySeed(seed, newId) {
  const targetNode = globalNodeList.find(node => node.seed === seed);
  if (targetNode) {
    targetNode.id = newId;
  }
}

function updateNodeTextBySeed(seed, newText) {
  const targetNode = globalNodeList.find(node => node.seed === seed);
  if (targetNode) {
    targetNode.text = newText;
  }
}

// 根据seed删除元素
function removeNodeBySeed(seed) {
  const index = globalNodeList.findIndex(node => node.seed === seed);
  if (index !== -1) {
    globalNodeList.splice(index, 1);
  }
}
// 版本号，用于强制刷新缓存 - 修改此值可强制浏览器重新加载静态资源
const WEILIN_VERSION = '1.0.1';

// 资源加载状态
let resourcesLoaded = false;
let resourcesLoading = false;

// 按需加载资源 - 只在用户首次打开编辑器时才加载
function loadResourcesOnDemand() {
  // 如果资源已加载或正在加载，直接返回
  if (resourcesLoaded || resourcesLoading) return Promise.resolve();
  
  resourcesLoading = true;
  
  return new Promise((resolve) => {
    let loadedCount = 0;
    const totalResources = 4;
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalResources) {
        resourcesLoaded = true;
        resourcesLoading = false;
        resolve();
      }
    };
    
    // 加载主JS (648KB) - 使用defer确保不阻塞
    var script1 = document.createElement('script');
    script1.src = './weilin/prompt_ui/webjs?v=' + WEILIN_VERSION;
    script1.type = 'text/javascript';
    script1.defer = true;
    script1.onload = checkAllLoaded;
    script1.onerror = checkAllLoaded;
    document.head.appendChild(script1);

    // 加载CSS - 使用preload优化
    var link1 = document.createElement('link');
    link1.rel = 'stylesheet';
    link1.type = 'text/css';
    link1.href = './weilin/prompt_ui/file/style.css?v=' + WEILIN_VERSION;
    link1.onload = checkAllLoaded;
    link1.onerror = checkAllLoaded;
    document.head.appendChild(link1);

    // loraStack 脚本载入
    var script2 = document.createElement('script');
    script2.src = './weilin/prompt_ui/file/lora_stack.js?v=' + WEILIN_VERSION;
    script2.type = 'text/javascript';
    script2.defer = true;
    script2.onload = checkAllLoaded;
    script2.onerror = checkAllLoaded;
    document.head.appendChild(script2);
    
    // loraStack CSS
    var link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.type = 'text/css';
    link2.href = './weilin/prompt_ui/file/lora_stack.css?v=' + WEILIN_VERSION;
    link2.onload = checkAllLoaded;
    link2.onerror = checkAllLoaded;
    document.head.appendChild(link2);
  });
}

// 不再自动加载资源，改为按需加载
// setTimeout(initWindow, 2000);

app.registerExtension({
  name: "weilin.prompt_ui_node",
  async init() {},
  async setup() {},
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // console.log(app)
    if (
      nodeData.name === "WeiLinPromptUI" ||
      nodeData.name === "WeiLinPromptUIWithoutLora" ||
      nodeData.name === "WeiLinPromptUIOnlyLoraStack"
    ) {
      // console.log(nodeData)
      // Create node
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = async function () {
        const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

        const thisNodeName = nodeData.name // 存储当前的节点名称
        let nodeTextAreaList = [] // 按顺序载入element，name="positive" || "lora_str" || "temp_str"
        let nodeWidgetList = [] // 保存widget引用，用于同步更新widget.value
        const thisNodeSeed = generateUUID(); // 随机唯一种子ID

        if (nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIWithoutLora") {
          hideWidgetForGood(this, this.widgets.find(w => w.name === "temp_str"))
          hideWidgetForGood(this, this.widgets.find(w => w.name === "random_template"))
        }
        if (nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIOnlyLoraStack") {
          hideWidgetForGood(this, this.widgets.find(w => w.name === "lora_str"))
          hideWidgetForGood(this, this.widgets.find(w => w.name === "temp_lora_str"))
        }

        for (let index = 0; index < this.widgets.length; index++) {
          const widgetItem = this.widgets[index];
          if (widgetItem.name == "positive") {
            let thisInputElement = widgetItem.element
            // thisInputElement.readOnly = true
            nodeTextAreaList[0] = thisInputElement
            nodeWidgetList[0] = widgetItem
          } else if (widgetItem.name == "lora_str") {
            let thisInputElement = widgetItem.element
            thisInputElement.readOnly = true
            nodeTextAreaList[1] = thisInputElement
            nodeWidgetList[1] = widgetItem
          } else if (widgetItem.name == "temp_str") {
            let thisInputElement = widgetItem.element
            thisInputElement.readOnly = true
            nodeTextAreaList[2] = thisInputElement
            nodeWidgetList[2] = widgetItem
          } else if (widgetItem.name == "temp_lora_str") {
            let thisInputElement = widgetItem.element
            thisInputElement.readOnly = true
            nodeTextAreaList[3] = thisInputElement
            nodeWidgetList[3] = widgetItem
          } else if (widgetItem.name == "random_template") {
            let thisInputElement = widgetItem.element
            thisInputElement.readOnly = true
            nodeTextAreaList[4] = thisInputElement
            nodeWidgetList[4] = widgetItem
          }
        }

        // 监听lora数据变化，通知UI窗口同步
        if (nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIOnlyLoraStack") {
          // 监听 lora_str 变化
          if (nodeTextAreaList[1]) {
            const loraTextarea = nodeTextAreaList[1];
            const originalLoraValue = loraTextarea.value;
            
            // 使用 MutationObserver 监听值变化
            const loraObserver = new MutationObserver(() => {
              if (loraTextarea.value !== originalLoraValue) {
                notifyLoraDataChange();
              }
            });
            
            // 同时监听 input 事件
            loraTextarea.addEventListener('input', () => {
              notifyLoraDataChange();
            });
            
            // 监听 value 属性变化
            let currentLoraValue = loraTextarea.value;
            Object.defineProperty(loraTextarea, 'value', {
              get() {
                return currentLoraValue;
              },
              set(newValue) {
                currentLoraValue = newValue;
                notifyLoraDataChange();
              },
              enumerable: true,
              configurable: true
            });
          }
          
          // 监听 temp_lora_str 变化
          if (nodeTextAreaList[3]) {
            const tempLoraTextarea = nodeTextAreaList[3];
            const originalTempLoraValue = tempLoraTextarea.value;
            
            // 监听 input 事件
            tempLoraTextarea.addEventListener('input', () => {
              notifyLoraDataChange();
            });
            
            // 监听 value 属性变化
            let currentTempLoraValue = tempLoraTextarea.value;
            Object.defineProperty(tempLoraTextarea, 'value', {
              get() {
                return currentTempLoraValue;
              },
              set(newValue) {
                currentTempLoraValue = newValue;
                notifyLoraDataChange();
              },
              enumerable: true,
              configurable: true
            });
          }
        }
        
        // 通知UI窗口lora数据变化的函数
        function notifyLoraDataChange() {
          if (promptBoxRandomID) {
            let jsonData = {
              prompt: nodeTextAreaList[0] ? nodeTextAreaList[0].value : "",
              lora: [],
              temp_prompt: {},
              temp_lora: {},
            }
            if (nodeData.name === "WeiLinPromptUI" && nodeTextAreaList[1] && nodeTextAreaList[1].value && nodeTextAreaList[1].value.length > 0) {
              try {
                jsonData.lora = JSON.parse(nodeTextAreaList[1].value);
              } catch (e) {}
            }
            if (nodeTextAreaList[2] && nodeTextAreaList[2].value && nodeTextAreaList[2].value.length > 0) {
              try {
                jsonData.temp_prompt = JSON.parse(nodeTextAreaList[2].value)
              } catch (e) {}
            }
            if ((nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIOnlyLoraStack") && nodeTextAreaList[3] && nodeTextAreaList[3].value && nodeTextAreaList[3].value.length > 0) {
              try {
                jsonData.temp_lora = JSON.parse(nodeTextAreaList[3].value)
              } catch (e) {}
            }
            
            window.postMessage({
              type: 'weilin_prompt_ui_lora_data_changed_' + promptBoxRandomID,
              data: JSON.stringify(jsonData)
            }, '*')
          }
        }

        // Lora Stack 创建可视化节点
        if (nodeData.name === "WeiLinPromptUIOnlyLoraStack") {
          await createLoraStackWidget(this, thisNodeSeed,nodeTextAreaList[3]);
        }

        // console.log(this)

        if (nodeData.name === "WeiLinPromptUI" ||
          nodeData.name === "WeiLinPromptUIWithoutLora") {
          globalNodeList.push({ seed: thisNodeSeed, text: nodeTextAreaList[0].value, id: this.id })

          const textarea = nodeTextAreaList[0];

          textarea.addEventListener('input', (event) => {
            const newValue = event.target.value;
            updateNodeTextBySeed(newValue);
            window.parent.postMessage({ type: 'weilin_prompt_ui_update_node_list_info', nodeList: globalNodeList }, '*')
          });
        }

        // 监听节点ID
        let currentThisId = this.id
        Object.defineProperty(this, 'id', {
          get() {
            return currentThisId;
          },
          set(newValue) {
            currentThisId = newValue;
            onTisIdChange(newValue);
          },
          enumerable: true,
          configurable: true
        });

        function onTisIdChange(newId) {
          // console.log(newId)
          if (nodeData.name === "WeiLinPromptUI" ||
            nodeData.name === "WeiLinPromptUIWithoutLora") {
            updateNodeIdBySeed(thisNodeSeed, newId);
            window.parent.postMessage({ type: 'weilin_prompt_ui_update_node_list_info', nodeList: globalNodeList }, '*')
          }
        }

        // 监听 this.title 的变化
        let currentTitle = this.title; // 缓存当前值
        Object.defineProperty(this, 'title', {
          get() {
            return currentTitle;
          },
          set(newValue) {
            // console.log(`this.title changed from ${currentTitle} to ${newValue}`);
            currentTitle = newValue;
            // 触发回调，返回新的 this.title 数据
            onTitleChange(newValue);
          },
          enumerable: true,
          configurable: true
        });

        // 监听 this.title 变化的回调函数
        function onTitleChange(newTitle) {
          // console.log("New this.title:", newTitle);
          // 在这里可以处理新的 this.title 数据
          // 例如，将新的 this.title 传递给其他逻辑
          if (nodeData.name === "WeiLinPromptUI" ||
            nodeData.name === "WeiLinPromptUIWithoutLora") {
            updateNodeTitleBySeed(thisNodeSeed, newTitle);
            window.parent.postMessage({ type: 'weilin_prompt_ui_update_node_list_info', nodeList: globalNodeList }, '*')
          }
        }

        // console.log(thisNodeSeed)

        //console.log(globalNodeList)

        // 为不同的按钮使用不同的ID，避免冲突
        let promptBoxRandomID = ""
        let loraStackRandomID = ""

        // 定义消息处理函数，保存引用以便后续移除
        const messageHandler = (event) => {
          // console.log(e)
          if (event.data.type === 'weilin_prompt_ui_prompt_update_prompt_' + promptBoxRandomID) {
            // 接收到更新提示词内容消息

            const jsonReponse = JSON.parse(event.data.data)
            // console.log(jsonReponse)
            nodeTextAreaList[0].value = jsonReponse.prompt;
            if (nodeWidgetList[0]) nodeWidgetList[0].value = jsonReponse.prompt;

            if (nodeData.name === "WeiLinPromptUI") {
              // console.log(jsonReponse.lora.length)
              if (jsonReponse.lora && jsonReponse.lora.length > 0 && jsonReponse.lora != "") {
                if (nodeTextAreaList[1]) nodeTextAreaList[1].value = JSON.stringify(jsonReponse.lora);
                if (nodeWidgetList[1]) nodeWidgetList[1].value = JSON.stringify(jsonReponse.lora);
              } else {
                if (nodeTextAreaList[1]) nodeTextAreaList[1].value = "";
                if (nodeWidgetList[1]) nodeWidgetList[1].value = "";
              }
            }

            if (jsonReponse.temp_prompt && jsonReponse.temp_prompt != "") {
              if (nodeTextAreaList[2]) nodeTextAreaList[2].value = JSON.stringify(jsonReponse.temp_prompt);
              if (nodeWidgetList[2]) nodeWidgetList[2].value = JSON.stringify(jsonReponse.temp_prompt);
            }else {
              if (nodeTextAreaList[2]) nodeTextAreaList[2].value = "";
              if (nodeWidgetList[2]) nodeWidgetList[2].value = "";
            }

            if (nodeData.name === "WeiLinPromptUI") {
              if (jsonReponse.temp_lora && jsonReponse.temp_lora != "") {
                if (nodeTextAreaList[3]) nodeTextAreaList[3].value = JSON.stringify(jsonReponse.temp_lora);
                if (nodeWidgetList[3]) nodeWidgetList[3].value = JSON.stringify(jsonReponse.temp_lora);
              }else {
                if (nodeTextAreaList[3]) nodeTextAreaList[3].value = "";
                if (nodeWidgetList[3]) nodeWidgetList[3].value = "";
              }
            }


            // console.log(nodeTextAreaList)
            updateNodeTextBySeed(thisNodeSeed, jsonReponse.prompt);
            window.parent.postMessage({ type: 'weilin_prompt_ui_update_node_list_info', nodeList: globalNodeList }, '*')

          } else if (event.data.type === 'weilin_prompt_ui_prompt_get_node_list_info') {
            // 获取节点导航信息
            if (nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIWithoutLora") {
              updateNodeTextBySeed(thisNodeSeed, nodeTextAreaList[0].value);
              window.parent.postMessage({ type: 'weilin_prompt_ui_update_node_list_info', nodeList: globalNodeList }, '*')
            }

          } else if (event.data.type === "weilin_prompt_ui_prompt_open_node_wit_seed" && event.data.seed === thisNodeSeed) {
            // 节点导航打开节点UI按钮
            // 先加载资源
            loadResourcesOnDemand().then(() => {
              promptBoxRandomID = generateUUID();
              // console.log("register====>",promptBoxRandomID)
              let jsonData = {
                prompt: nodeTextAreaList[0].value,
                lora: [],
                temp_prompt: {},
                temp_lora: {},
              }
              if (nodeData.name === "WeiLinPromptUI" && nodeTextAreaList[1] && nodeTextAreaList[1].value && nodeTextAreaList[1].value.length > 0) {
                jsonData.lora = JSON.parse(nodeTextAreaList[1].value);
              }
              if (nodeTextAreaList[2] && nodeTextAreaList[2].value && nodeTextAreaList[2].value.length > 0) {
                jsonData.temp_prompt = JSON.parse(nodeTextAreaList[2].value)
              }
              if (nodeData.name === "WeiLinPromptUI" && nodeTextAreaList[3] && nodeTextAreaList[3].value && nodeTextAreaList[3].value.length > 0) {
                jsonData.temp_lora = JSON.parse(nodeTextAreaList[3].value)
              }

              const data = JSON.stringify(jsonData)
              window.parent.postMessage({ type: 'weilin_prompt_ui_openPromptBox', id: promptBoxRandomID, prompt: data, node: nodeData.name }, '*')
            });
          
          } else if (event.data.type === 'weilin_prompt_ui_prompt_finish_lora_stack_' + promptBoxRandomID) {
            // 接收到更新LoraStack内容消息
            const jsonReponse = JSON.parse(event.data.data)
            // console.log(jsonReponse)
            if (nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIOnlyLoraStack") {
              // console.log(jsonReponse.lora.length)
              if (jsonReponse.lora && jsonReponse.lora.length > 0 && jsonReponse.lora != "") {
                if (nodeTextAreaList[1]) nodeTextAreaList[1].value = JSON.stringify(jsonReponse.lora);
                if (nodeWidgetList[1]) nodeWidgetList[1].value = JSON.stringify(jsonReponse.lora);
              } else {
                if (nodeTextAreaList[1]) nodeTextAreaList[1].value = "";
                if (nodeWidgetList[1]) nodeWidgetList[1].value = "";
              }

              if (jsonReponse.temp_lora && jsonReponse.temp_lora != "") {
                if (nodeTextAreaList[3]) nodeTextAreaList[3].value = JSON.stringify(jsonReponse.temp_lora);
                if (nodeWidgetList[3]) nodeWidgetList[3].value = JSON.stringify(jsonReponse.temp_lora);
              }else{
                if (nodeTextAreaList[3]) nodeTextAreaList[3].value = "";
                if (nodeWidgetList[3]) nodeWidgetList[3].value = "";
              }

              if (nodeTextAreaList[3] && nodeTextAreaList[3].value && nodeTextAreaList[3].value.length > 0) {
                window.weilinGlobalSelectedLoras[thisNodeSeed] = JSON.parse(nodeTextAreaList[3].value)
              }else {
                window.weilinGlobalSelectedLoras[thisNodeSeed]= []
              }
              renderAllLoras(thisNodeSeed)
            }
          
          }else if (event.data.type === "weilin_prompt_ui_prompt_node_finish_lora_stack_" + thisNodeSeed) {
            // 接收到更新LoraStack内容消息
            const jsonReponse = JSON.parse(event.data.data)
            if (nodeData.name === "WeiLinPromptUIOnlyLoraStack") {
              if (jsonReponse.lora && jsonReponse.lora.length > 0 && jsonReponse.lora != "") {
                if (nodeTextAreaList[1]) nodeTextAreaList[1].value = JSON.stringify(jsonReponse.lora);
                if (nodeWidgetList[1]) nodeWidgetList[1].value = JSON.stringify(jsonReponse.lora);
              } else {
                if (nodeTextAreaList[1]) nodeTextAreaList[1].value = "";
                if (nodeWidgetList[1]) nodeWidgetList[1].value = "";
              }
              if (jsonReponse.temp_lora && jsonReponse.temp_lora != "") {
                if (nodeTextAreaList[3]) nodeTextAreaList[3].value = JSON.stringify(jsonReponse.temp_lora);
                if (nodeWidgetList[3]) nodeWidgetList[3].value = JSON.stringify(jsonReponse.temp_lora);
              }else{
                if (nodeTextAreaList[3]) nodeTextAreaList[3].value = "";
                if (nodeWidgetList[3]) nodeWidgetList[3].value = "";
              }
            }
          }else if (event.data.type === "weilin_prompt_ui_selectLora_stack_node_"+thisNodeSeed) {
            addLora(thisNodeSeed,event.data.lora)
          }else if (event.data.type === "weilin_prompt_ui_update_template_"+promptBoxRandomID) {
            nodeTextAreaList[4].value = event.data.data
            if (nodeWidgetList[4]) nodeWidgetList[4].value = event.data.data
          }else if (event.data.type === "weilin_prompt_ui_get_template_"+promptBoxRandomID) {
            window.parent.postMessage({ type: 'weilin_prompt_ui_get_template_response', id: promptBoxRandomID, data: nodeTextAreaList[4].value }, '*')
          }else if (event.data.type === "weilin_prompt_ui_get_template_go_random_"+promptBoxRandomID) {
            window.parent.postMessage({ type: 'weilin_prompt_ui_get_template_go_random_response', id: promptBoxRandomID, data: nodeTextAreaList[4].value }, '*')
          }

        };

        // 注册消息监听器
        window.addEventListener('message', messageHandler, false);

        // 添加按钮点击事件
        if (nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIWithoutLora") {
          // 节点按钮点击事件 - 打开提示词编辑器
          this.addWidget("button", localLanguage, '', async ($e) => {
            // 先加载资源（如果还未加载）
            await loadResourcesOnDemand();
            
            // console.log(thisNodeName)
            // 发送消息给父窗口
            // console.log(global_randomID)
            promptBoxRandomID = generateUUID();
            // console.log("register====>",promptBoxRandomID)
            let jsonData = {
              prompt: nodeTextAreaList[0].value,
              lora: [],
              temp_prompt: {},
              temp_lora: {},
            }
            if (nodeData.name === "WeiLinPromptUI" && nodeTextAreaList[1] && nodeTextAreaList[1].value && nodeTextAreaList[1].value.length > 0) {
              jsonData.lora = JSON.parse(nodeTextAreaList[1].value);
            }

            if (nodeTextAreaList[2] && nodeTextAreaList[2].value && nodeTextAreaList[2].value.length > 0) {
              jsonData.temp_prompt = JSON.parse(nodeTextAreaList[2].value)
            }

            if (nodeData.name === "WeiLinPromptUI" && nodeTextAreaList[3] && nodeTextAreaList[3].value && nodeTextAreaList[3].value.length > 0) {
              jsonData.temp_lora = JSON.parse(nodeTextAreaList[3].value)
            }

            const data = JSON.stringify(jsonData)
            window.parent.postMessage({ type: 'weilin_prompt_ui_openPromptBox', id: promptBoxRandomID, prompt: data, node: nodeData.name }, '*')
          });
        }

        if (nodeData.name === "WeiLinPromptUI" || nodeData.name === "WeiLinPromptUIOnlyLoraStack") {
          // 节点按钮点击事件 - 打开Lora堆
          this.addWidget("button", localOpenLoraLanguage, '', async ($e) => {
            // 先加载资源（如果还未加载）
            await loadResourcesOnDemand();
            
            // console.log(thisNodeName)
            // 发送消息给父窗口
            // console.log(global_randomID)
            loraStackRandomID = generateUUID();
            // console.log("register====>",loraStackRandomID)
            let jsonData = {
              lora: [],
              temp_lora: {},
            }
            if (nodeTextAreaList[1] && nodeTextAreaList[1].value && nodeTextAreaList[1].value.length > 0) {
              jsonData.lora = JSON.parse(nodeTextAreaList[1].value);
            }

            if (nodeTextAreaList[3] && nodeTextAreaList[3].value && nodeTextAreaList[3].value.length > 0) {
              jsonData.temp_lora = JSON.parse(nodeTextAreaList[3].value)
            }

            const data = JSON.stringify(jsonData)
            window.parent.postMessage({ type: 'weilin_prompt_ui_open_node_lora_stack_window', seed: loraStackRandomID, prompt: data, node: nodeData.name }, '*')
          });
        }

        // 保存原有的onRemoved函数
        const originalOnRemoved = this.onRemoved;
        // 节点被删除事件
        this.onRemoved = () => {
          // 调用原有的onRemoved函数
          if (originalOnRemoved) {
            originalOnRemoved.apply(this);
          }
          
          // 移除消息监听器，防止内存泄漏和事件冲突
          window.removeEventListener('message', messageHandler, false);
          
          // 元素被销毁 事件发送更新元素
          if (nodeData.name === "WeiLinPromptUI" ||
            nodeData.name === "WeiLinPromptUIWithoutLora") {
            removeNodeBySeed(thisNodeSeed);
            window.parent.postMessage({ type: 'weilin_prompt_ui_update_node_list_info', nodeList: globalNodeList }, '*')
          }
          
          // 清理Lora Stack相关数据
          if (nodeData.name === "WeiLinPromptUIOnlyLoraStack") {
            if (window.weilinGlobalSelectedLoras && window.weilinGlobalSelectedLoras[thisNodeSeed]) {
              delete window.weilinGlobalSelectedLoras[thisNodeSeed];
            }
          }
        }

        return r;
      };

      // When the node is executed we will be sent the input text, display this in the widget
      const onExecuted = nodeType.prototype.onExecuted;
      nodeType.prototype.onExecuted = function (message) {
        onExecuted?.apply(this, arguments);
        const positiveWidget = this.widgets.find(w => w.name === "positive");
        if (positiveWidget && message.positive) {
          positiveWidget.element.value = message.positive;
          // 触发input事件以更新全局状态
          const event = new Event('input', { bubbles: true });
          positiveWidget.element.dispatchEvent(event);
        }
        // console.log(message.positive)
      };
    }
  },
});


//from melmass
// https://github.com/kijai/ComfyUI-KJNodes/blob/main/web/js/spline_editor.js
function hideWidgetForGood(node, widget, suffix = '') {
  widget.origType = widget.type
  widget.origComputeSize = widget.computeSize
  widget.origSerializeValue = widget.serializeValue
  widget.computeSize = () => [0, -4] // -4 is due to the gap litegraph adds between widgets automatically
  widget.type = "converted-widget" + suffix

  widget.element.style.display = 'none'
  // widget.serializeValue = () => {
  //     // Prevent serializing the widget if we have no input linked
  //     const w = node.inputs?.find((i) => i.widget?.name === widget.name);
  //     if (w?.link == null) {
  //         return undefined;
  //     }
  //     return widget.origSerializeValue ? widget.origSerializeValue() : widget.value;
  // };

  // Hide any linked widgets, e.g. seed+seedControl
  if (widget.linkedWidgets) {
    for (const w of widget.linkedWidgets) {
      hideWidgetForGood(node, w, ':' + widget.name)
    }
  }
}

function createLoraStackWidget(node, seed, ptEl) {
  var element = document.createElement("div");
  const previewNode = node;
  const prSeed = seed;
  const prTempLoraEl = ptEl;


  var previewWidget = node.addDOMWidget("weilin_lora_stack", "lora_stack", element, {
    serialize: false,
    hideOnZoom: false,
    getValue() {
      return element.value;
    },
    setValue(v) {
      element.value = v;
    },
  });

  previewNode.onResize = function () {
    let [w, h] = previewNode.size;
    if (h < 300) h = 300;
    previewNode.size = [w, h];
  };


  previewWidget.value = { hidden: false, paused: false, params: {} }
  previewWidget.parentEl = document.createElement("div");
  previewWidget.parentEl.className = "weilin-comfyui-lora-stack";
  element.appendChild(previewWidget.parentEl);

  const lang = navigator.language || navigator.userLanguage;
  const localLang = lang.startsWith('zh') ? 'zh' : 'en';
  previewWidget.contentEl = document.createElement("div");
  previewWidget.contentEl.innerHTML = `
    <div class="weilin-comfyui-lora-header">
        <div class="weilin-comfyui-header-actions">
            <button class="weilin-comfyui-add-btn" id="addLoraBtn_`+prSeed+`" data-seed="`+prSeed+`" title="${localLang === 'zh' ? '添加Lora' : 'Add Lora' }">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
            </button>
        </div>
    </div>
    <div class="weilin-comfyui-lora-body">
        <div class="weilin-comfyui-lora-list" id="loraListContainer_`+prSeed+`">
            <!-- Lora items will be added here dynamically -->
        </div>
    </div>
  `
  previewWidget.contentEl.className = "weilin-comfyui-lora-content"
  previewWidget.parentEl.appendChild(previewWidget.contentEl)
  
  // 使用 addEventListener 绑定点击事件，更可靠
  const addLoraBtn = document.getElementById('addLoraBtn_' + prSeed);
  if (addLoraBtn) {
    addLoraBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const seed = this.getAttribute('data-seed');
      if (seed && typeof openLoraManager === 'function') {
        openLoraManager(this);
      }
    });
    // 阻止事件冒泡，防止被 LiteGraph 拦截
    addLoraBtn.addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });
    addLoraBtn.addEventListener('mouseup', function(e) {
      e.stopPropagation();
    });
  }

  setTimeout(() => {
    if (prTempLoraEl.value.length > 0) {
      window.weilinGlobalSelectedLoras[seed] = JSON.parse(prTempLoraEl.value)
    }else {
      window.weilinGlobalSelectedLoras[seed]= []
    }
    renderAllLoras(seed)
    // console.log(window.weilinGlobalSelectedLoras)
  },300)

  // console.log(node)
}
