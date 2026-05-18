import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function CommentsSection({ riverName, riverState }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`comments:${riverName}:${riverState}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `river_name=eq.${riverName}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [riverName, riverState]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('river_name', riverName)
        .eq('river_state', riverState)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.from('comments').insert({
        river_name: riverName,
        river_state: riverState,
        username: username || 'Anonymous',
        comment_text: commentText,
        rating: rating,
        video_url: videoUrl || null,
      });

      if (error) throw error;

      // Reset form
      setCommentText('');
      setUsername('');
      setRating(5);
      setVideoUrl('');
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Error posting comment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = comments.length > 0
    ? (comments.reduce((sum, c) => sum + (c.rating || 0), 0) / comments.length).toFixed(1)
    : 0;

  return (
    <div style={{
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      padding: '15px',
      marginTop: '15px',
      border: '1px solid #ddd'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1em' }}>💬 Comments ({comments.length})</h3>
        <div style={{ fontSize: '0.95em', color: '#666' }}>
          ⭐ Avg Rating: <strong>{averageRating}</strong>/5
        </div>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}
        >
          ➕ Add Comment
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
          <input
            type="text"
            placeholder="Your name (optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />

          <textarea
            placeholder="Share your experience on this river..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              minHeight: '80px',
              fontFamily: 'inherit'
            }}
          />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em', fontWeight: 'bold' }}>
                Rating: <span style={{ color: '#e74c3c' }}>{rating}⭐</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <input
            type="url"
            placeholder="Video link (YouTube, Vimeo, etc. - optional)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? '⏳ Posting...' : '✓ Post Comment'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {loading ? (
          <p style={{ color: '#999' }}>Loading comments...</p>
        ) : comments.length === 0 ? (
          <p style={{ color: '#999', fontStyle: 'italic' }}>No comments yet. Be the first to share!</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                backgroundColor: '#fff',
                padding: '12px',
                marginBottom: '10px',
                borderRadius: '6px',
                border: '1px solid #e0e0e0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                <div>
                  <strong style={{ color: '#333' }}>{comment.username}</strong>
                  <span style={{ color: '#e74c3c', marginLeft: '8px' }}>
                    {'⭐'.repeat(comment.rating)}
                  </span>
                </div>
                <span style={{ fontSize: '0.8em', color: '#999' }}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>

              <p style={{ margin: '8px 0', color: '#555', lineHeight: '1.4' }}>
                {comment.comment_text}
              </p>

              {comment.video_url && (
                <a
                  href={comment.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    color: '#007bff',
                    textDecoration: 'none',
                    fontSize: '0.9em',
                    marginTop: '8px'
                  }}
                >
                  🎥 Watch video
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
