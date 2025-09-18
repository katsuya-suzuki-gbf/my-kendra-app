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

// C# APIからの最終的な応答全体の型
// interface FinalApiResponse {
//   bedrockSummaryJson: string;
//   sourceDocuments: KendraResult[];
// }
interface FinalApiResponse {
  bedrockSummary: BedrockSummary; // 文字列ではなくオブジェクト
  sourceDocuments: KendraResult[];
}

function App() {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState('');
  const [apiResponse, setApiResponse] = useState<FinalApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // C# APIのベースURL（ご自身の環境に合わせてください）
  const API_BASE_URL = 'https://localhost:7283';

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
    setIsLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      const params = new URLSearchParams({ query });
      if (user) {
        params.append('user', user);
      }
      const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.statusText}`);
      }
      const data: FinalApiResponse = await response.json();
      setApiResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <> {/* ★ containerの外にも要素を置くため、フラグメント <> で全体を囲む */}
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
        <button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? '検索中...' : '検索'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {apiResponse && (
        <div className="results">
          {/* --- 要約結果の表示 --- */}
          <h2>【総合的要約】</h2>
          <div className="summary">
            {apiResponse.bedrockSummary.summary}
          </div>

          {/* sourceDocumentsが1件以上ある場合のみ、以下のエリアを表示 */}
          {apiResponse.sourceDocuments.length > 0 && (
          <>
            <h2>【関連する内容のとりまとめと対応内容】</h2>
            <div className="categories">
              {apiResponse.bedrockSummary.categories.map((category) => (
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

            {/* --- 元データの表示 --- */}
            <h2>参考にした過去の対応履歴</h2>
            <div className="source-documents">
              {apiResponse.sourceDocuments.map((doc) => (
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
          </>
          )}
        </div>
      )}
    </div>
    {/* ★★★ フローティングボタンの描画 ★★★ */}
    {showBackToTop && (
      <button onClick={scrollToTop} className="back-to-top-floating-btn">
        ▲
      </button>
    )}
  </>
  );
}

export default App;