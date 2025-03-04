document.addEventListener('DOMContentLoaded', function() {
    const seoForm = document.getElementById('seoForm');
    const apiKeyInput = document.getElementById('apiKey');
    const languageSelect = document.getElementById('language');
    const productNameInput = document.getElementById('productName');
    const productDescInput = document.getElementById('productDesc');
    const articleTopicInput = document.getElementById('articleTopic');
    const generateBtn = document.getElementById('generateBtn');
    const outputContent = document.getElementById('outputContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // 生成文章事件
    seoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 获取表单数据
        const apiKey = apiKeyInput.value.trim();
        const language = languageSelect.value;
        const productName = productNameInput.value.trim();
        const productDesc = productDescInput.value.trim();
        const articleTopic = articleTopicInput.value.trim();
        
        if (!apiKey || !productName || !productDesc || !articleTopic) {
            showAlert('请填写所有必填字段', 'danger');
            return;
        }
        
        // 显示加载状态
        startLoading();
        
        // 清空之前的内容，准备新的输出
        outputContent.innerHTML = '<div id="article-content"></div>';
        const articleContent = document.getElementById('article-content');
        
        try {
            await generateSEOArticle(apiKey, language, productName, productDesc, articleTopic, articleContent);
            // 生成完成后启用复制和下载按钮
            copyBtn.disabled = false;
            downloadBtn.disabled = false;
        } catch (error) {
            outputContent.innerHTML = `<div class="alert alert-danger">生成失败: ${error.message}</div>`;
            console.error('Error:', error);
        } finally {
            // 隐藏加载状态
            stopLoading();
        }
    });
    
    // 复制文章内容
    copyBtn.addEventListener('click', function() {
        const content = document.getElementById('article-content').innerText;
        navigator.clipboard.writeText(content)
            .then(() => showAlert('文章内容已复制到剪贴板', 'success'))
            .catch(err => showAlert('复制失败: ' + err, 'danger'));
    });
    
    // 下载文章内容
    downloadBtn.addEventListener('click', function() {
        const content = document.getElementById('article-content').innerText;
        const productName = productNameInput.value.trim();
        const fileName = `SEO文章_${productName}_${new Date().toISOString().slice(0,10)}.txt`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert('文章已下载', 'success');
    });
    
    // 生成SEO文章的主要函数
    async function generateSEOArticle(apiKey, language, productName, productDesc, articleTopic, outputElement) {
        // 构建提示词
        const languageText = language === 'zh' ? '中文' : 'English';
        const prompt = `请生成一篇针对${productName}的SEO优化文章。
        文章主题: ${articleTopic}
        产品介绍: ${productDesc}
        请用${languageText}撰写，文章长度不少于1000字。
        文章应当包含引人入胜的标题，SEO优化的描述，多个小标题，以及产品的关键点和优势。
        请确保文章结构清晰，内容丰富，对搜索引擎友好，能够提高产品在搜索结果中的排名。`;
        
        try {
            const response = await fetch('https://api.ppinfra.com/v3/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-r1/community",
                    messages: [{ role: "user", content: prompt }],
                    stream: true,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || '未知错误');
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // 处理完整的行，保留最后一个可能不完整的行
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data.trim() === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const content = json.choices[0]?.delta?.content || '';
                            if (content) {
                                // 流式更新UI
                                appendToOutput(outputElement, content);
                            }
                        } catch (e) {
                            console.error('解析响应数据时出错:', e, data);
                        }
                    }
                }
            }
            
            // 处理剩余的buffer
            if (buffer) {
                if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
                    const data = buffer.slice(6);
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content || '';
                        if (content) {
                            appendToOutput(outputElement, content);
                        }
                    } catch (e) {
                        console.error('解析最后的响应数据时出错:', e, data);
                    }
                }
            }
            
        } catch (error) {
            console.error('获取API响应时出错:', error);
            throw error;
        }
    }
    
    // 辅助函数：将内容添加到输出元素
    function appendToOutput(element, text) {
        // 将文本中的换行符转换为<br>标签
        const formattedText = text.replace(/\n/g, '<br>');
        element.innerHTML += formattedText;
        // 滚动到底部
        element.parentElement.scrollTop = element.parentElement.scrollHeight;
    }
    
    // 显示加载状态
    function startLoading() {
        generateBtn.disabled = true;
        loadingIndicator.classList.remove('d-none');
        copyBtn.disabled = true;
        downloadBtn.disabled = true;
    }
    
    // 隐藏加载状态
    function stopLoading() {
        generateBtn.disabled = false;
        loadingIndicator.classList.add('d-none');
    }
    
    // 显示提示信息
    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // 3秒后自动关闭
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 3000);
    }
});
