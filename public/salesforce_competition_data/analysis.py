import pandas as pd
import json
from collections import Counter
import re
from datetime import datetime

# Load data
sf = pd.read_csv('/Users/arnavkothari/Desktop/Profiledata/salesforce_merged.csv')
hs = pd.read_csv('/Users/arnavkothari/Desktop/Profiledata/HubSpot_merged.csv')
sn = pd.read_csv('/Users/arnavkothari/Desktop/Profiledata/ServiceNow_merged.csv')
ry = pd.read_csv('/Users/arnavkothari/Desktop/Profiledata/Ryanair_merged.csv')

datasets = {'Salesforce': sf, 'HubSpot': hs, 'ServiceNow': sn, 'Ryanair': ry}

print("=" * 80)
print("COMPETITIVE X/TWITTER ANALYSIS — SALESFORCE vs. COMPETITORS")
print("=" * 80)

# ============================================================
# SECTION 1: DATASET OVERVIEW
# ============================================================
print("\n\n" + "=" * 80)
print("1. DATASET OVERVIEW")
print("=" * 80)
for name, df in datasets.items():
    print(f"\n--- {name} ---")
    print(f"  Total comment rows: {len(df)}")
    # Get unique posts
    unique_posts = df['parentPostUrl'].nunique()
    print(f"  Unique posts scraped: {unique_posts}")
    # Date range
    if 'timestamp' in df.columns:
        dates = pd.to_datetime(df['timestamp'], errors='coerce').dropna()
        if len(dates) > 0:
            print(f"  Date range (comments): {dates.min().strftime('%Y-%m-%d')} to {dates.max().strftime('%Y-%m-%d')}")
    if 'timestamp_post' in df.columns:
        post_dates = pd.to_datetime(df['timestamp_post'], errors='coerce').dropna()
        if len(post_dates) > 0:
            print(f"  Date range (posts): {post_dates.min().strftime('%Y-%m-%d')} to {post_dates.max().strftime('%Y-%m-%d')}")

# ============================================================
# SECTION 2: POST-LEVEL ENGAGEMENT METRICS
# ============================================================
print("\n\n" + "=" * 80)
print("2. POST-LEVEL ENGAGEMENT METRICS (per unique post)")
print("=" * 80)

for name, df in datasets.items():
    # De-duplicate to get one row per post
    post_cols = [c for c in df.columns if c.endswith('_post') or c in ['parentPostUrl', 'postUrl', 'postId']]
    # Get unique posts by parentPostUrl
    posts = df.drop_duplicates(subset='parentPostUrl').copy()

    print(f"\n--- {name} ({len(posts)} posts) ---")

    for metric in ['likes_post', 'reposts_post', 'replies_post', 'views_post']:
        if metric in posts.columns:
            vals = pd.to_numeric(posts[metric], errors='coerce').dropna()
            if len(vals) > 0:
                label = metric.replace('_post', '').upper()
                print(f"  {label}:")
                print(f"    Mean: {vals.mean():,.1f} | Median: {vals.median():,.1f} | Max: {vals.max():,.0f} | Total: {vals.sum():,.0f}")

# ============================================================
# SECTION 3: ENGAGEMENT RATE ANALYSIS
# ============================================================
print("\n\n" + "=" * 80)
print("3. ENGAGEMENT RATE ANALYSIS (engagement / views)")
print("=" * 80)

for name, df in datasets.items():
    posts = df.drop_duplicates(subset='parentPostUrl').copy()
    likes = pd.to_numeric(posts.get('likes_post'), errors='coerce').fillna(0)
    reposts = pd.to_numeric(posts.get('reposts_post'), errors='coerce').fillna(0)
    replies = pd.to_numeric(posts.get('replies_post'), errors='coerce').fillna(0)
    views = pd.to_numeric(posts.get('views_post'), errors='coerce').fillna(0)

    total_engagement = likes + reposts + replies

    # Only where views > 0
    mask = views > 0
    if mask.sum() > 0:
        rates = (total_engagement[mask] / views[mask]) * 100
        print(f"\n--- {name} ({mask.sum()} posts with view data) ---")
        print(f"  Mean engagement rate: {rates.mean():.3f}%")
        print(f"  Median engagement rate: {rates.median():.3f}%")
        print(f"  Aggregate engagement rate: {total_engagement[mask].sum() / views[mask].sum() * 100:.3f}%")

        # Avg likes/views, reposts/views, replies/views
        print(f"  Like rate: {(likes[mask].sum() / views[mask].sum()) * 100:.3f}%")
        print(f"  Repost rate: {(reposts[mask].sum() / views[mask].sum()) * 100:.3f}%")
        print(f"  Reply rate: {(replies[mask].sum() / views[mask].sum()) * 100:.3f}%")
    else:
        print(f"\n--- {name} --- No view data available")

# ============================================================
# SECTION 4: TOP PERFORMING POSTS PER ACCOUNT
# ============================================================
print("\n\n" + "=" * 80)
print("4. TOP 10 POSTS BY VIEWS (per account)")
print("=" * 80)

for name, df in datasets.items():
    posts = df.drop_duplicates(subset='parentPostUrl').copy()
    posts['views_num'] = pd.to_numeric(posts.get('views_post'), errors='coerce')
    posts['likes_num'] = pd.to_numeric(posts.get('likes_post'), errors='coerce')
    posts['reposts_num'] = pd.to_numeric(posts.get('reposts_post'), errors='coerce')
    posts['replies_num'] = pd.to_numeric(posts.get('replies_post'), errors='coerce')

    top = posts.nlargest(10, 'views_num')

    print(f"\n--- {name} ---")
    for i, (_, row) in enumerate(top.iterrows(), 1):
        text = str(row.get('text_post', ''))[:120].replace('\n', ' ')
        views = row.get('views_num', 0)
        likes = row.get('likes_num', 0)
        reposts = row.get('reposts_num', 0)
        replies = row.get('replies_num', 0)
        eng_rate = ((likes + reposts + replies) / views * 100) if views > 0 else 0
        print(f"  #{i}: {views:>10,.0f} views | {likes:>6,.0f} likes | {reposts:>5,.0f} RTs | {replies:>5,.0f} replies | ER: {eng_rate:.2f}%")
        print(f"       \"{text}...\"")
        print(f"       URL: {row.get('parentPostUrl', 'N/A')}")

# ============================================================
# SECTION 5: TOP POSTS BY ENGAGEMENT RATE
# ============================================================
print("\n\n" + "=" * 80)
print("5. TOP 10 POSTS BY ENGAGEMENT RATE (min 1000 views)")
print("=" * 80)

for name, df in datasets.items():
    posts = df.drop_duplicates(subset='parentPostUrl').copy()
    posts['views_num'] = pd.to_numeric(posts.get('views_post'), errors='coerce')
    posts['likes_num'] = pd.to_numeric(posts.get('likes_post'), errors='coerce')
    posts['reposts_num'] = pd.to_numeric(posts.get('reposts_post'), errors='coerce')
    posts['replies_num'] = pd.to_numeric(posts.get('replies_post'), errors='coerce')

    posts = posts[posts['views_num'] >= 1000].copy()
    posts['eng_rate'] = (posts['likes_num'] + posts['reposts_num'] + posts['replies_num']) / posts['views_num'] * 100

    top = posts.nlargest(10, 'eng_rate')

    print(f"\n--- {name} ---")
    for i, (_, row) in enumerate(top.iterrows(), 1):
        text = str(row.get('text_post', ''))[:120].replace('\n', ' ')
        print(f"  #{i}: ER: {row['eng_rate']:.2f}% | {row['views_num']:>10,.0f} views | {row['likes_num']:>6,.0f} likes")
        print(f"       \"{text}...\"")

# ============================================================
# SECTION 6: CONTENT THEMES & PATTERNS
# ============================================================
print("\n\n" + "=" * 80)
print("6. CONTENT THEME ANALYSIS")
print("=" * 80)

theme_keywords = {
    'Product/Feature': ['feature', 'product', 'launch', 'new', 'update', 'release', 'introducing', 'announce'],
    'AI/Agents': ['ai', 'agent', 'agentforce', 'artificial intelligence', 'machine learning', 'copilot', 'gpt', 'llm', 'autonomous'],
    'Customer Story': ['customer', 'success', 'story', 'case study', 'result', 'testimonial', 'helped'],
    'Event/Conference': ['event', 'conference', 'summit', 'dreamforce', 'knowledge', 'inbound', 'register', 'join us', 'keynote', 'world tour'],
    'Culture/People': ['team', 'employee', 'culture', 'people', 'hiring', 'join', 'career', 'intern', 'ohana', 'trailblazer'],
    'Thought Leadership': ['future', 'trend', 'insight', 'learn', 'how to', 'why', 'strategy', 'transformation', 'digital'],
    'Humor/Meme': ['lol', 'haha', 'meme', 'mood', 'vibe', 'relatable', 'literally', 'pov', '😂', '🤣', 'when you'],
    'Partnership': ['partner', 'collaboration', 'together', 'integrate', 'integration', 'ecosystem'],
    'Data/Research': ['report', 'survey', 'data', 'stat', 'research', 'study', 'percent', 'finding', '%'],
    'CEO/Executive': ['ceo', 'founder', 'executive', 'leadership', 'benioff', 'marc'],
}

for name, df in datasets.items():
    posts = df.drop_duplicates(subset='parentPostUrl').copy()
    posts['views_num'] = pd.to_numeric(posts.get('views_post'), errors='coerce').fillna(0)
    posts['likes_num'] = pd.to_numeric(posts.get('likes_post'), errors='coerce').fillna(0)
    posts['reposts_num'] = pd.to_numeric(posts.get('reposts_post'), errors='coerce').fillna(0)
    posts['replies_num'] = pd.to_numeric(posts.get('replies_post'), errors='coerce').fillna(0)
    posts['eng'] = posts['likes_num'] + posts['reposts_num'] + posts['replies_num']
    posts['eng_rate'] = posts.apply(lambda r: (r['eng'] / r['views_num'] * 100) if r['views_num'] > 0 else 0, axis=1)

    print(f"\n--- {name} ({len(posts)} posts) ---")
    print(f"  {'Theme':<22} | {'Count':>5} | {'% Posts':>7} | {'Avg Views':>10} | {'Avg ER':>8} | {'Avg Likes':>9}")
    print(f"  {'-'*22}-+-{'-'*5}-+-{'-'*7}-+-{'-'*10}-+-{'-'*8}-+-{'-'*9}")

    theme_results = []
    for theme, keywords in theme_keywords.items():
        pattern = '|'.join(keywords)
        mask = posts['text_post'].astype(str).str.lower().str.contains(pattern, na=False)
        count = mask.sum()
        if count > 0:
            pct = count / len(posts) * 100
            avg_views = posts.loc[mask, 'views_num'].mean()
            avg_er = posts.loc[mask, 'eng_rate'].mean()
            avg_likes = posts.loc[mask, 'likes_num'].mean()
            theme_results.append((theme, count, pct, avg_views, avg_er, avg_likes))

    theme_results.sort(key=lambda x: -x[4])  # sort by avg ER
    for theme, count, pct, avg_views, avg_er, avg_likes in theme_results:
        print(f"  {theme:<22} | {count:>5} | {pct:>6.1f}% | {avg_views:>10,.0f} | {avg_er:>7.2f}% | {avg_likes:>9,.0f}")

# ============================================================
# SECTION 7: POSTING CADENCE
# ============================================================
print("\n\n" + "=" * 80)
print("7. POSTING CADENCE & TIMING")
print("=" * 80)

for name, df in datasets.items():
    posts = df.drop_duplicates(subset='parentPostUrl').copy()
    posts['ts'] = pd.to_datetime(posts.get('timestamp_post'), errors='coerce')
    posts = posts.dropna(subset=['ts'])

    if len(posts) == 0:
        print(f"\n--- {name} --- No timestamp data")
        continue

    posts['views_num'] = pd.to_numeric(posts.get('views_post'), errors='coerce').fillna(0)
    posts['likes_num'] = pd.to_numeric(posts.get('likes_post'), errors='coerce').fillna(0)
    posts['reposts_num'] = pd.to_numeric(posts.get('reposts_post'), errors='coerce').fillna(0)
    posts['replies_num'] = pd.to_numeric(posts.get('replies_post'), errors='coerce').fillna(0)
    posts['eng'] = posts['likes_num'] + posts['reposts_num'] + posts['replies_num']

    posts['hour'] = posts['ts'].dt.hour
    posts['dow'] = posts['ts'].dt.day_name()

    date_range = (posts['ts'].max() - posts['ts'].min()).days
    posts_per_day = len(posts) / max(date_range, 1)
    posts_per_week = posts_per_day * 7

    print(f"\n--- {name} ---")
    print(f"  Total posts: {len(posts)} over {date_range} days")
    print(f"  Posting frequency: {posts_per_day:.1f}/day ({posts_per_week:.1f}/week)")

    # Best hours
    hour_perf = posts.groupby('hour').agg(
        count=('eng', 'count'),
        avg_views=('views_num', 'mean'),
        avg_eng=('eng', 'mean')
    ).sort_values('avg_eng', ascending=False)

    print(f"\n  Top posting hours (by avg engagement):")
    for hour, row in hour_perf.head(5).iterrows():
        print(f"    {hour:02d}:00 UTC — {row['count']} posts, avg views: {row['avg_views']:,.0f}, avg engagement: {row['avg_eng']:,.0f}")

    # Best days
    dow_perf = posts.groupby('dow').agg(
        count=('eng', 'count'),
        avg_views=('views_num', 'mean'),
        avg_eng=('eng', 'mean')
    ).sort_values('avg_eng', ascending=False)

    print(f"\n  Top posting days (by avg engagement):")
    for dow, row in dow_perf.head(5).iterrows():
        print(f"    {dow:<10} — {row['count']} posts, avg views: {row['avg_views']:,.0f}, avg engagement: {row['avg_eng']:,.0f}")

# ============================================================
# SECTION 8: COMMENT SENTIMENT & QUALITY
# ============================================================
print("\n\n" + "=" * 80)
print("8. COMMENT QUALITY & AUDIENCE ENGAGEMENT")
print("=" * 80)

for name, df in datasets.items():
    comments = df[df['authorHandle'] != df.get('authorHandle_post', '').iloc[0] if len(df) > 0 else True].copy()

    print(f"\n--- {name} ---")
    print(f"  Total comments: {len(comments)}")

    # Avg comments per post
    comments_per_post = df.groupby('parentPostUrl').size()
    print(f"  Avg comments per post: {comments_per_post.mean():.1f}")
    print(f"  Median comments per post: {comments_per_post.median():.1f}")
    print(f"  Max comments on single post: {comments_per_post.max()}")

    # Comment engagement (likes on comments)
    comment_likes = pd.to_numeric(comments.get('likes'), errors='coerce').fillna(0)
    print(f"  Avg likes per comment: {comment_likes.mean():.1f}")
    print(f"  Comments with 10+ likes: {(comment_likes >= 10).sum()}")
    print(f"  Comments with 100+ likes: {(comment_likes >= 100).sum()}")

    # Comment length analysis
    comments['text_len'] = comments['text'].astype(str).str.len()
    print(f"  Avg comment length: {comments['text_len'].mean():.0f} chars")

    # Sentiment keywords (simple)
    pos_words = ['great', 'love', 'amazing', 'awesome', 'best', 'excellent', 'fantastic', 'congratulations', 'congrats', 'thank', 'beautiful', 'incredible', 'brilliant', 'perfect', 'wonderful']
    neg_words = ['bad', 'terrible', 'worst', 'hate', 'awful', 'broken', 'sucks', 'disappointed', 'frustrat', 'useless', 'garbage', 'horrible', 'poor', 'scam', 'spam', 'waste']

    text_lower = comments['text'].astype(str).str.lower()
    pos_count = text_lower.str.contains('|'.join(pos_words), na=False).sum()
    neg_count = text_lower.str.contains('|'.join(neg_words), na=False).sum()

    print(f"  Positive sentiment comments: {pos_count} ({pos_count/max(len(comments),1)*100:.1f}%)")
    print(f"  Negative sentiment comments: {neg_count} ({neg_count/max(len(comments),1)*100:.1f}%)")

    # Top commenters
    top_commenters = comments['authorHandle'].value_counts().head(5)
    print(f"  Top repeat commenters:")
    for handle, count in top_commenters.items():
        print(f"    @{handle}: {count} comments")

# ============================================================
# SECTION 9: POST FORMAT / CONTENT TYPE ANALYSIS
# ============================================================
print("\n\n" + "=" * 80)
print("9. POST FORMAT ANALYSIS")
print("=" * 80)

for name, df in datasets.items():
    posts = df.drop_duplicates(subset='parentPostUrl').copy()
    posts['text_str'] = posts['text_post'].astype(str)
    posts['views_num'] = pd.to_numeric(posts.get('views_post'), errors='coerce').fillna(0)
    posts['likes_num'] = pd.to_numeric(posts.get('likes_post'), errors='coerce').fillna(0)
    posts['reposts_num'] = pd.to_numeric(posts.get('reposts_post'), errors='coerce').fillna(0)
    posts['replies_num'] = pd.to_numeric(posts.get('replies_post'), errors='coerce').fillna(0)
    posts['eng'] = posts['likes_num'] + posts['reposts_num'] + posts['replies_num']
    posts['eng_rate'] = posts.apply(lambda r: (r['eng'] / r['views_num'] * 100) if r['views_num'] > 0 else 0, axis=1)

    # Has link
    has_link = posts['text_str'].str.contains('http', na=False)
    # Has mention
    has_mention = posts['text_str'].str.contains('@', na=False)
    # Has emoji
    has_emoji = posts['text_str'].str.contains(r'[\U0001F600-\U0001F9FF\U00002702-\U000027B0]', na=False, regex=True)
    # Has hashtag
    has_hashtag = posts['text_str'].str.contains('#', na=False)
    # Has media (photo in URL)
    has_media = posts['parentPostUrl'].astype(str).str.contains('photo|video', na=False)
    # Post length
    posts['text_len'] = posts['text_str'].str.len()
    posts['is_short'] = posts['text_len'] <= 100
    posts['is_medium'] = (posts['text_len'] > 100) & (posts['text_len'] <= 250)
    posts['is_long'] = posts['text_len'] > 250
    # Has question
    has_question = posts['text_str'].str.contains(r'\?', na=False)

    print(f"\n--- {name} ({len(posts)} posts) ---")

    format_checks = {
        'Has Link': has_link,
        'Has @Mention': has_mention,
        'Has Hashtag': has_hashtag,
        'Has Media': has_media,
        'Has Question': has_question,
        'Short (<=100)': posts['is_short'],
        'Medium (101-250)': posts['is_medium'],
        'Long (250+)': posts['is_long'],
    }

    print(f"  {'Format':<20} | {'Count':>5} | {'% Posts':>7} | {'Avg Views':>10} | {'Avg ER':>8} | {'Avg Eng':>8}")
    print(f"  {'-'*20}-+-{'-'*5}-+-{'-'*7}-+-{'-'*10}-+-{'-'*8}-+-{'-'*8}")

    for fmt_name, mask in format_checks.items():
        count = mask.sum()
        if count > 0:
            pct = count / len(posts) * 100
            avg_views = posts.loc[mask, 'views_num'].mean()
            avg_er = posts.loc[mask, 'eng_rate'].mean()
            avg_eng = posts.loc[mask, 'eng'].mean()
            print(f"  {fmt_name:<20} | {count:>5} | {pct:>6.1f}% | {avg_views:>10,.0f} | {avg_er:>7.2f}% | {avg_eng:>8,.0f}")

# ============================================================
# SECTION 10: SALESFORCE-SPECIFIC DEEP DIVE
# ============================================================
print("\n\n" + "=" * 80)
print("10. SALESFORCE-SPECIFIC DEEP DIVE")
print("=" * 80)

sf_posts = sf.drop_duplicates(subset='parentPostUrl').copy()
sf_posts['text_str'] = sf_posts['text_post'].astype(str)
sf_posts['views_num'] = pd.to_numeric(sf_posts.get('views_post'), errors='coerce').fillna(0)
sf_posts['likes_num'] = pd.to_numeric(sf_posts.get('likes_post'), errors='coerce').fillna(0)
sf_posts['reposts_num'] = pd.to_numeric(sf_posts.get('reposts_post'), errors='coerce').fillna(0)
sf_posts['replies_num'] = pd.to_numeric(sf_posts.get('replies_post'), errors='coerce').fillna(0)
sf_posts['eng'] = sf_posts['likes_num'] + sf_posts['reposts_num'] + sf_posts['replies_num']
sf_posts['eng_rate'] = sf_posts.apply(lambda r: (r['eng'] / r['views_num'] * 100) if r['views_num'] > 0 else 0, axis=1)

# What % of Salesforce posts mention Agentforce
agentforce = sf_posts['text_str'].str.lower().str.contains('agentforce', na=False)
non_agentforce = ~agentforce

print(f"\n  Agentforce content:")
print(f"    Posts mentioning Agentforce: {agentforce.sum()} ({agentforce.sum()/len(sf_posts)*100:.1f}%)")
if agentforce.sum() > 0:
    print(f"    Avg views: {sf_posts.loc[agentforce, 'views_num'].mean():,.0f}")
    print(f"    Avg ER: {sf_posts.loc[agentforce, 'eng_rate'].mean():.3f}%")
if non_agentforce.sum() > 0:
    print(f"  Non-Agentforce content:")
    print(f"    Posts: {non_agentforce.sum()} ({non_agentforce.sum()/len(sf_posts)*100:.1f}%)")
    print(f"    Avg views: {sf_posts.loc[non_agentforce, 'views_num'].mean():,.0f}")
    print(f"    Avg ER: {sf_posts.loc[non_agentforce, 'eng_rate'].mean():.3f}%")

# Negative comments about Salesforce
sf_comments = sf.copy()
neg_sf = sf_comments[sf_comments['text'].astype(str).str.lower().str.contains('broken|terrible|worst|hate|awful|frustrat|useless|sucks|spam|scam|disappooint|poor|bug|issue|problem|fix|help', na=False)]
print(f"\n  Negative/complaint comments: {len(neg_sf)} ({len(neg_sf)/max(len(sf_comments),1)*100:.1f}% of all comments)")
print(f"\n  Sample negative comments:")
for _, row in neg_sf.head(10).iterrows():
    text = str(row['text'])[:150].replace('\n', ' ')
    print(f"    - @{row.get('authorHandle','?')}: \"{text}\"")

# Self-reply threads (Salesforce replying to itself)
sf_self_replies = sf[sf['authorHandle'].astype(str).str.lower() == 'salesforce']
print(f"\n  Salesforce self-replies/threads: {len(sf_self_replies)}")

# ============================================================
# SECTION 11: RYANAIR PLAYBOOK — WHY IT WORKS
# ============================================================
print("\n\n" + "=" * 80)
print("11. RYANAIR PLAYBOOK — WHAT MAKES IT THE ENGAGEMENT KING")
print("=" * 80)

ry_posts = ry.drop_duplicates(subset='parentPostUrl').copy()
ry_posts['text_str'] = ry_posts['text_post'].astype(str)
ry_posts['views_num'] = pd.to_numeric(ry_posts.get('views_post'), errors='coerce').fillna(0)
ry_posts['likes_num'] = pd.to_numeric(ry_posts.get('likes_post'), errors='coerce').fillna(0)
ry_posts['reposts_num'] = pd.to_numeric(ry_posts.get('reposts_post'), errors='coerce').fillna(0)
ry_posts['replies_num'] = pd.to_numeric(ry_posts.get('replies_post'), errors='coerce').fillna(0)
ry_posts['eng'] = ry_posts['likes_num'] + ry_posts['reposts_num'] + ry_posts['replies_num']
ry_posts['eng_rate'] = ry_posts.apply(lambda r: (r['eng'] / r['views_num'] * 100) if r['views_num'] > 0 else 0, axis=1)

print(f"\n  Total posts: {len(ry_posts)}")
print(f"  Avg views: {ry_posts['views_num'].mean():,.0f}")
print(f"  Avg likes: {ry_posts['likes_num'].mean():,.0f}")
print(f"  Avg reposts: {ry_posts['reposts_num'].mean():,.0f}")
print(f"  Avg replies: {ry_posts['replies_num'].mean():,.0f}")
print(f"  Avg engagement: {ry_posts['eng'].mean():,.0f}")
print(f"  Avg engagement rate: {ry_posts['eng_rate'].mean():.2f}%")

# Ryanair reply pattern — do they reply to other brands/users?
ry_brand_replies = ry_posts[ry_posts['text_str'].str.contains('@', na=False)]
print(f"\n  Posts with @mentions: {len(ry_brand_replies)} ({len(ry_brand_replies)/len(ry_posts)*100:.1f}%)")

# Short vs long
ry_posts['text_len'] = ry_posts['text_str'].str.len()
short = ry_posts[ry_posts['text_len'] <= 100]
long = ry_posts[ry_posts['text_len'] > 100]
print(f"\n  Short posts (<=100 chars): {len(short)} — Avg ER: {short['eng_rate'].mean():.2f}%")
print(f"  Long posts (>100 chars): {len(long)} — Avg ER: {long['eng_rate'].mean():.2f}%")

# Top Ryanair posts (the viral ones)
print(f"\n  Top 5 Ryanair posts by engagement:")
for i, (_, row) in enumerate(ry_posts.nlargest(5, 'eng').iterrows(), 1):
    text = row['text_str'][:150].replace('\n', ' ')
    print(f"    #{i}: {row['eng']:,.0f} total eng | {row['views_num']:,.0f} views | ER: {row['eng_rate']:.2f}%")
    print(f"        \"{text}\"")

# ============================================================
# SECTION 12: COMPARATIVE SUMMARY TABLE
# ============================================================
print("\n\n" + "=" * 80)
print("12. HEAD-TO-HEAD COMPARISON TABLE")
print("=" * 80)

summary = []
for name, df in datasets.items():
    posts = df.drop_duplicates(subset='parentPostUrl').copy()
    views = pd.to_numeric(posts.get('views_post'), errors='coerce').fillna(0)
    likes = pd.to_numeric(posts.get('likes_post'), errors='coerce').fillna(0)
    reposts = pd.to_numeric(posts.get('reposts_post'), errors='coerce').fillna(0)
    replies = pd.to_numeric(posts.get('replies_post'), errors='coerce').fillna(0)
    eng = likes + reposts + replies

    mask = views > 0
    agg_er = eng[mask].sum() / views[mask].sum() * 100 if mask.sum() > 0 else 0

    comments_per_post = df.groupby('parentPostUrl').size().mean()

    summary.append({
        'Account': name,
        'Posts': len(posts),
        'Avg Views': f"{views.mean():,.0f}",
        'Avg Likes': f"{likes.mean():,.0f}",
        'Avg Reposts': f"{reposts.mean():,.0f}",
        'Avg Replies': f"{replies.mean():,.0f}",
        'Agg ER': f"{agg_er:.3f}%",
        'Avg Comments/Post': f"{comments_per_post:.1f}",
    })

print(f"\n  {'Account':<12} | {'Posts':>5} | {'Avg Views':>10} | {'Avg Likes':>9} | {'Avg RTs':>8} | {'Avg Replies':>11} | {'Agg ER':>8} | {'Cmts/Post':>9}")
print(f"  {'-'*12}-+-{'-'*5}-+-{'-'*10}-+-{'-'*9}-+-{'-'*8}-+-{'-'*11}-+-{'-'*8}-+-{'-'*9}")
for s in summary:
    print(f"  {s['Account']:<12} | {s['Posts']:>5} | {s['Avg Views']:>10} | {s['Avg Likes']:>9} | {s['Avg Reposts']:>8} | {s['Avg Replies']:>11} | {s['Agg ER']:>8} | {s['Avg Comments/Post']:>9}")

# ============================================================
# SECTION 13: HUBSPOT VOICE & TONE ANALYSIS
# ============================================================
print("\n\n" + "=" * 80)
print("13. HUBSPOT — CONTENT STRATEGY DEEP DIVE")
print("=" * 80)

hs_posts = hs.drop_duplicates(subset='parentPostUrl').copy()
hs_posts['text_str'] = hs_posts['text_post'].astype(str)
hs_posts['views_num'] = pd.to_numeric(hs_posts.get('views_post'), errors='coerce').fillna(0)
hs_posts['likes_num'] = pd.to_numeric(hs_posts.get('likes_post'), errors='coerce').fillna(0)
hs_posts['reposts_num'] = pd.to_numeric(hs_posts.get('reposts_post'), errors='coerce').fillna(0)
hs_posts['replies_num'] = pd.to_numeric(hs_posts.get('replies_post'), errors='coerce').fillna(0)
hs_posts['eng'] = hs_posts['likes_num'] + hs_posts['reposts_num'] + hs_posts['replies_num']
hs_posts['eng_rate'] = hs_posts.apply(lambda r: (r['eng'] / r['views_num'] * 100) if r['views_num'] > 0 else 0, axis=1)

print(f"\n  Total posts: {len(hs_posts)}")
print(f"  Avg views: {hs_posts['views_num'].mean():,.0f}")
print(f"  Avg engagement rate: {hs_posts['eng_rate'].mean():.2f}%")

# Sample posts - show full text for voice analysis
print(f"\n  Sample HubSpot posts (for voice/tone analysis):")
for i, (_, row) in enumerate(hs_posts.nlargest(15, 'eng').iterrows(), 1):
    text = row['text_str'][:300].replace('\n', ' | ')
    print(f"\n    #{i} [Views: {row['views_num']:,.0f} | ER: {row['eng_rate']:.2f}%]")
    print(f"    \"{text}\"")

print("\n\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)
