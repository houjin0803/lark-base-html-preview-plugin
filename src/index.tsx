import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { bitable, FieldType, ITextField } from '@lark-base-open/js-sdk';
import { Alert, Card, Button } from 'antd';
import DOMPurify from 'dompurify'; // 用于防止XSS攻击
import styles from './index.module.less';


// 定义HTML预览组件的Props接口
interface HtmlPreviewProps {
  html: string;
}

// HTML预览组件
const HtmlPreview: React.FC<HtmlPreviewProps> = ({ html }) => {
  const cleanHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['script', 'link', 'style'],
    ADD_ATTR: ['src', 'href', 'rel', 'type'],
    WHOLE_DOCUMENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
  
  const handlePreview = () => {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      // 构建完整的HTML文档结构
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>HTML预览</title>
            <style>
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow-x: hidden;
              }
              body {
                padding: 20px;
                box-sizing: border-box;
              }
              .content {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
              }
              /* 确保图片不会超出容器 */
              img {
                max-width: 100%;
                height: auto;
              }
              /* 确保表格能够正常显示 */
              table {
                width: 100%;
                max-width: 100%;
                border-collapse: collapse;
              }
              /* 添加响应式支持 */
              @media screen and (max-width: 768px) {
                body {
                  padding: 10px;
                }
              }
            </style>
          </head>
          <body>
            <div class="content">
              ${cleanHtml}
            </div>
          </body>
        </html>
      `;
      previewWindow.document.write(fullHtml);
      previewWindow.document.close();
    }
  };

  return (
    <div className={styles['html-preview'] }>
      {/* 预览按钮 */}
      <Button 
        type="primary" 
        onClick={handlePreview}
        className={styles['preview-button']}
      >
        在新窗口中预览
      </Button>
      
      {/* 内容预览框 */}
      <div className={styles['preview-container']}>
        <iframe
          srcDoc={cleanHtml}
          className={styles['preview-iframe']}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
          // 允许更多权限以加载外部资源
        />
      </div>
    </div>
  );
};

// 定义AlertType类型
type AlertType = 'info' | 'success' | 'error' | 'warning';

interface IContentObject {
  text?: string;
  html?: string;
  [key: string]: any;
}

function LoadApp() {
  const [info, setInfo] = useState('正在加载表格信息...');
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [htmlContent, setHtmlContent] = useState<string>('');

  // 监听单元格选择
  useEffect(() => {
    const handleCellClick = async () => {
      try {
        const table = await bitable.base.getActiveTable();
        const selection = await bitable.base.getSelection();
        
        if (!selection || !selection.recordId || !selection.fieldId) {
          return;
        }

        // 获取字段信息
        const fieldMeta = await table.getFieldMetaById(selection.fieldId);
        
        // 检查字段类型
        if (fieldMeta.type !== FieldType.Text) {
          setInfo('请选择文本类型的单元格');
          setAlertType('warning');
          return;
        }

        // 获取单元格内容
        const field = await table.getField<ITextField>(selection.fieldId);
        const content = await field.getValue(selection.recordId);

        if (!content) {
          setInfo('单元格内容为空');
          setAlertType('warning');
          return;
        }
      // 处理内容格式
      let htmlString = '';
      if (Array.isArray(content)) {
        // 如果是数组，尝试提取text或者其他可能的HTML内容字段
        htmlString = content.map(item => {
          if (typeof item === 'object' && item !== null) {
            const contentItem = item as IContentObject;
            return contentItem.text || contentItem.html || JSON.stringify(item);
          }
          return String(item);
        }).join('');
      } else if (typeof content === 'object' && content !== null) {
        const contentObj = content as IContentObject;
        htmlString = contentObj.text || contentObj.html || JSON.stringify(content);
      } else {
        htmlString = String(content || '');
      }
      
        setHtmlContent(htmlString);
        setInfo(`正在预览 ${fieldMeta.name} 字段的HTML内容`);
        setAlertType('success');

      } catch (error) {
        setInfo(`预览失败: ${error instanceof Error ? error.message : '未知错误'}`);
        setAlertType('error');
        setHtmlContent('');
      }
    };

    // 监听选择变化
    const off = bitable.base.onSelectionChange(handleCellClick);

    // 清理函数
    return () => {
      off();
    };
  }, []);

  return (
    <div className={styles['app-container']}>
      <Alert 
        message={info} 
        type={alertType} 
        className={styles['alert']}
        showIcon
      />

      {/* HTML预览区域 */}
      {htmlContent && (
        <Card 
          title="HTML预览"
          className={styles['preview-card']}
        >
          <HtmlPreview html={htmlContent} />
        </Card>
      )}

      {!htmlContent && (
        <div className={styles['empty-state']}>
          请选择包含HTML内容的单元格进行预览
        </div>
      )}
    </div>
  );
}

// 渲染应用
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LoadApp />
  </React.StrictMode>
)