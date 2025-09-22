import { useState, useEffect } from 'react';
import './App.css'; // あとでスタイルを追記します

// APIからの応答の型を定義
interface KendraResult {
  documentId: string;
  user: string;
  title: string;
  content: string;
  date: string;
}

// Bedrockが生成するJSON内の"categories"配列の要素の型
interface SummaryCategory {
  title: string;
  details: string;
  related_ids: string[];
}

// Bedrockが生成するJSON全体の型
interface BedrockSummary {
  summary: string;
  categories: SummaryCategory[];
}

function App() {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState('');

  const [sourceDocuments, setSourceDocuments] = useState<KendraResult[] | null>(null);
  const [bedrockSummary, setBedrockSummary] = useState<BedrockSummary | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // C# APIのベースURL（ご自身の環境に合わせてください）
  // const API_BASE_URL = 'https://localhost:7283';
  const API_BASE_URL = 'https://cjdmuzpmsd.ap-northeast-1.awsapprunner.com';

  const [showBackToTop, setShowBackToTop] = useState(false);

  // スクロールイベントを監視する副作用フック
  useEffect(() => {
    const handleScroll = () => {
      // 200pxより多くスクロールされたらボタンを表示
      if (window.scrollY > 200) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    // イベントリスナーを登録
    window.addEventListener('scroll', handleScroll);

    // コンポーネントがアンマウントされる時にイベントリスナーを解除
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // 空の配列を渡すことで、コンポーネントのマウント時に一度だけ実行

  // トップに戻るための関数 (変更なし)
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleSearch = async () => {
    if (!query) {
      setError('検索キーワードを入力してください。');
      return;
    }
    
    setIsSearching(true);
    setIsSummarizing(false); // 要約ローディングをリセット
    setError(null);
    setSourceDocuments(null);
    setBedrockSummary(null);

    try {
      const params = new URLSearchParams({ query });
      if (user) params.append('user', user);

      const response = await fetch(`${API_BASE_URL}/api/search/documents?${params.toString()}`);
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      
      const data: KendraResult[] = await response.json();
      setSourceDocuments(data); // 先にKendraの結果だけをセット
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Kendraの結果が取得されたら、Bedrockでの要約を非同期で開始する
  useEffect(() => {
    const summarizeResults = async () => {
      if (!sourceDocuments || sourceDocuments.length === 0) return;

      setIsSummarizing(true);
      try {
        const params = new URLSearchParams({ query });
        if (user) params.append('user', user);

        const response = await fetch(`${API_BASE_URL}/api/search/summarize?${params.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query,
            kendraResults: sourceDocuments
          }),
        });
        if (!response.ok) throw new Error(`Bedrock API Error: ${response.statusText}`);

        const data: BedrockSummary = await response.json();
        setBedrockSummary(data); // 後からBedrockの結果をセット
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSummarizing(false);
      }
    };

    summarizeResults();
  }, [sourceDocuments]); // sourceDocumentsが更新された時だけ実行

  return (
    <> {/* containerの外にも要素を置くため、フラグメント <> で全体を囲む */}
    <div className="container">
      <h1>サポート履歴検索</h1>
      <div className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索キーワード (例: TLリンカーン)"
          className="search-input"
        />
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="顧客名 (部分一致・任意)"
          className="user-input"
        />
        <button 
          onClick={handleSearch} 
          disabled={isSearching || isSummarizing}
        >
          {isSearching 
            ? '検索中...' 
            : isSummarizing 
              ? '要約中...' 
              : '検索'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* 検索中のローディング表示 */}
      {isSearching && <div className="loading-message"><p>過去の事例を検索中...</p></div>}
      {/* Kendraの結果（リスト）はすぐに表示 */}
      {sourceDocuments && sourceDocuments.length > 0 && (
        <div className="results">
          {/* 要約中はローディング表示 */}
          {isSummarizing && <div className="loading-message"><h2>AIによる要約を生成中...</h2></div>}
          
          {/* Bedrockの結果（要約）は準備ができ次第表示 */}
          {bedrockSummary && (
            <>
              <h2>【総合的要約】</h2>
              <div className="summary">
                {bedrockSummary.summary}
              </div>
              <h2>【関連する内容のとりまとめと対応内容】</h2>
              <div className="categories">
                {bedrockSummary.categories.map((category) => (
                  <div key={category.title} className="category-card">
                    <h3>{category.title}</h3>
                    <p>{category.details}</p>
                    <p><strong>対象事例ID: </strong>
                      {category.related_ids.map((id, index) => (
                        <span key={id}>
                          {index > 0 && ', '}
                          <a href={`#doc-${id}`}>{id}</a>
                        </span>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
              <hr className="divider" />
            </>
          )}

          <h2>参考にした過去の対応履歴 ({sourceDocuments.length}件)</h2>
          <div className="source-documents">
            {sourceDocuments.map((doc) => (
              <div key={doc.documentId} id={`doc-${doc.documentId}`} className="document-card">
                <h3>{doc.title}</h3>
                <p>
                  <strong>問い合わせID:</strong> {doc.documentId} | 
                  <strong>顧客:</strong> {doc.user} | 
                  <strong>対応日:</strong> {doc.date}
                </p>
                <p>{doc.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 0件だった場合の表示 */}
      {sourceDocuments && sourceDocuments.length === 0 && (
         <div className="results"><h2>関連する情報は見つかりませんでした。</h2></div>
      )}
    </div>
    {/* フローティングボタンの描画 */}
    {showBackToTop && (
      <button onClick={scrollToTop} className="back-to-top-floating-btn">
        ▲
      </button>
    )}
  </>
  );
}

export default App;