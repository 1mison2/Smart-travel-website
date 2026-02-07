import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Plus, Image, Calendar, MapPin } from 'lucide-react';

export default function CommunitySection() {
  const [posts] = useState([
    {
      id: 1,
      author: 'Rajesh Sharma',
      avatar: '👨‍💼',
      date: '2 hours ago',
      content: 'Just completed the Annapurna Circuit! The sunrise from Poon Hill was absolutely breathtaking. The tea houses along the way were amazing! 🏔️',
      image: '🏔️',
      likes: 45,
      comments: 12,
      tags: ['Annapurna', 'Trekking', 'Nepal']
    },
    {
      id: 2,
      author: 'Pema Lama',
      avatar: '👩‍🦰',
      date: '5 hours ago',
      content: 'Found the best momo place in Thamel - tiny spot that serves the most incredible jhol momo. Only locals know about it!',
      image: '🥟',
      likes: 78,
      comments: 23,
      tags: ['Kathmandu', 'Food', 'LocalGems']
    },
    {
      id: 3,
      author: 'Sunita Gurung',
      avatar: '👩‍🎓',
      date: '1 day ago',
      content: 'Pro tip: Always carry warm layers for mountain treks in Nepal. Weather changes quickly in the Himalayas! Saved me so many times during my Everest region trek.',
      image: '🏔️',
      likes: 92,
      comments: 31,
      tags: ['TravelTips', 'Himalayas', 'Trekking']
    }
  ]);

  const [newPost, setNewPost] = useState('');

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Community Posts</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Create Post
        </button>
      </div>

      {/* Create New Post */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
            👤
          </div>
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your travel experience, tips, or photos..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Image className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <MapPin className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Calendar className="h-4 w-4" />
                </button>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                {post.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{post.author}</h3>
                    <p className="text-sm text-gray-500">{post.date}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                  </button>
                </div>
                
                <p className="text-gray-700 mb-3">{post.content}</p>
                
                {post.image && (
                  <div className="text-6xl text-center mb-3 py-4 bg-gray-50 rounded-lg">
                    {post.image}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                  <button className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button className="text-blue-600 hover:text-blue-700 font-medium">
          Load More Posts
        </button>
      </div>
    </section>
  );
}
