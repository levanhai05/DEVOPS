import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, BarChart3, Bell, Box, Check, ChevronLeft,
  ChevronRight, CreditCard, Filter, Heart, LayoutDashboard,
  LogOut, Mail, Menu, MapPin, Package, Pencil, Phone, Plus, Search, ShoppingBag, ShoppingCart,
  Star, Tag, Trash2, TrendingUp, Truck, User, Users, X
} from "lucide-react";
import { api, useFetch, setSession, setToken, clearSession, uploadImage } from "./api";
import "./styles.css";

const seedProducts = [
  {id:1,name:"Aero Runner",category:"Giày",price:1890000,old:2290000,rating:4.9,image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",tag:"Bán chạy"},
  {id:2,name:"Cloud Hoodie",category:"Thời trang",price:990000,old:1290000,rating:4.8,image:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",tag:"Mới"},
  {id:3,name:"Mono Backpack",category:"Phụ kiện",price:790000,old:950000,rating:4.7,image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",tag:"Hot"},
  {id:4,name:"Nova Watch",category:"Phụ kiện",price:2490000,old:2990000,rating:4.9,image:"https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85",tag:"-17%"},
  {id:5,name:"Essential Tee",category:"Thời trang",price:420000,old:520000,rating:4.6,image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",tag:"Sale"},
  {id:6,name:"Daily Tote",category:"Phụ kiện",price:620000,old:760000,rating:4.8,image:"https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=85",tag:"Mới"},
  {id:7,name:"Street Jacket",category:"Thời trang",price:1590000,old:1890000,rating:4.7,image:"https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85",tag:"Limited"},
  {id:8,name:"Trail Sneaker",category:"Giày",price:2190000,old:2590000,rating:4.9,image:"https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",tag:"Hot"}
];

const defaultStock={1:24,2:8,3:42,4:15,5:67,6:24,7:8,8:42};

const money = n => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(n);

function useLocalState(key,initial){
  const [value,setValue]=useState(()=>{
    try{ const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch{ return initial; }
  });
  useEffect(()=>{
    try{ localStorage.setItem(key,JSON.stringify(value)); }catch{}
  },[key,value]);
  return [value,setValue];
}

function useHashRoute(){
  const getRoute=()=>window.location.pathname.startsWith("/admin") ? window.location.pathname : (window.location.hash || "#/");
  const [route,setRoute]=useState(getRoute());
  useEffect(()=>{ const f=()=>setRoute(getRoute()); window.addEventListener("hashchange",f); window.addEventListener("popstate",f); return()=>{window.removeEventListener("hashchange",f);window.removeEventListener("popstate",f)}},[]);
  return route;
}

const PAGE_SIZE=12;
const normText=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const matchQuery=(p,q)=>{
  const words=normText(q).split(/\s+/).filter(Boolean);
  if(!words.length) return true;
  const hay=normText(`${p.name} ${p.category} ${p.tag}`);
  return words.every(w=>hay.includes(w));
};
const shopHref=({cat,q,page}={})=>{
  const sp=new URLSearchParams();
  if(cat) sp.set("cat",cat);
  if(q) sp.set("q",q);
  if(page>1) sp.set("page",page);
  const qs=sp.toString();
  return "#/shop"+(qs?"?"+qs:"");
};

function Header({cartCount,wishCount,onLogout,customerAuthed,query=""}){
  const [search,setSearch]=useState(query);
  useEffect(()=>{setSearch(query)},[query]);
  const submitSearch=()=>{ window.location.hash=shopHref({q:search.trim()}); };
  return <header className="header">
    <div className="container nav">
      <a href="#/" className="logo"><span className="logo-mark">H</span>HAI</a>
      <nav className="desktop-nav">
        <a href="#/">Trang chủ</a>
        <a href="#/wishlist" className="nav-wish">Yêu thích{wishCount>0&&<b>{wishCount}</b>}</a>
        <a href="#/about">Về chúng tôi</a>
        <a href="#/contact">Liên hệ</a>
      </nav>
      <div className="nav-actions">
        <div className="search-mini"><button type="button" className="search-go" onClick={submitSearch} title="Tìm kiếm"><Search size={17}/></button><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitSearch()} placeholder="Tìm sản phẩm..."/></div>
        <a className="icon-btn cart-btn" href="#/cart"><ShoppingCart size={19}/>{cartCount>0&&<b>{cartCount}</b>}</a>
        {customerAuthed
          ? <>
              <a className="icon-btn" href="#/orders" title="Đơn hàng của tôi"><Package size={19}/></a>
              <a className="icon-btn" href="#/profile" title="Hồ sơ cá nhân"><User size={19}/></a>
              <button className="icon-btn" onClick={onLogout} title="Đăng xuất"><LogOut size={19}/></button>
            </>
          : <a href="/login" className="primary small">Đăng nhập</a>}
      </div>
    </div>
  </header>
}

function ProductCard({p,onAdd,onWish,wished,stock}){
  const outOfStock=stock!==undefined && stock<=0;
  return <article className="product-card">
    <div className="product-image">
      <a href={`#/product/${p.id}`}><img src={p.image}/></a>
      <span className="product-tag">{p.tag}</span>
      <button className={`wish${wished?" active":""}`} onClick={()=>onWish(p.id)}><Heart size={17} fill={wished?"currentColor":"none"}/></button>
    </div>
    <div className="product-info"><div className="muted">{p.category}</div><a href={`#/product/${p.id}`} className="product-title-link"><h3>{p.name}</h3></a><div className="rating"><Star size={14} fill="currentColor"/>{p.rating}<span>128 đánh giá</span></div><div className="price-row"><strong>{money(p.price)}</strong><del>{money(p.old)}</del></div><button className="add-btn" disabled={outOfStock} onClick={()=>onAdd(p)}><ShoppingBag size={17}/> {outOfStock?"Hết hàng":"Thêm vào giỏ"}</button></div>
  </article>
}

const seedReviews=[
  {id:1,name:"Nguyễn Minh Anh",rating:5,date:"12/09/2026",comment:"Chất lượng vượt mong đợi, giao hàng nhanh. Mình sẽ ủng hộ shop dài dài!"},
  {id:2,name:"Trần Gia Huy",rating:4,date:"08/09/2026",comment:"Sản phẩm đẹp, đúng như hình. Trừ 1 sao vì đóng gói hơi đơn giản."},
  {id:3,name:"Lê Khánh Linh",rating:5,date:"01/09/2026",comment:"Form chuẩn, chất liệu mát và bền. Rất đáng tiền."}
];

function ProductDetail({id,products,onAdd,onWish,wished,stock}){
  const p=products.find(x=>x.id===Number(id));
  const {data:reviews,setData:setReviews}=useFetch(`/products/${id}/reviews`,[]);
  const [name,setName]=useState("");
  const [comment,setComment]=useState("");
  const [rating,setRating]=useState(5);
  if(!p) return <main className="shop-page"><div className="container"><p>Không tìm thấy sản phẩm.</p><a href="#/shop" className="text-link"><ChevronLeft size={16}/> Về cửa hàng</a></div></main>;
  const outOfStock=stock!==undefined && stock<=0;
  const avgRating=reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : p.rating;
  const submitReview=async e=>{
    e.preventDefault();
    if(!name.trim()||!comment.trim()) return;
    try{
      const created=await api(`/products/${id}/reviews`,{method:"POST",body:{name:name.trim(),rating,comment:comment.trim()}});
      setReviews(r=>[created,...r]);
      setName("");setComment("");setRating(5);
    }catch(err){ alert(err.message); }
  };
  return <main className="shop-page">
    <div className="container product-detail">
      <a href="#/shop" className="text-link back-shop"><ChevronLeft size={16}/> Về cửa hàng</a>
      <div className="product-detail-grid">
        <div className="product-detail-image"><img src={p.image}/><span className="product-tag">{p.tag}</span></div>
        <div className="product-detail-info">
          <div className="muted">{p.category}</div>
          <h1>{p.name}</h1>
          <div className="rating"><Star size={16} fill="currentColor"/>{p.rating}<span>128 đánh giá</span></div>
          <div className="price-row detail-price"><strong>{money(p.price)}</strong><del>{money(p.old)}</del></div>
          <p className="product-desc">Sản phẩm {p.name} thuộc danh mục {p.category}, được tuyển chọn kỹ lưỡng về chất liệu và thiết kế, phù hợp cho nhịp sống hiện đại.</p>
          <div className="detail-actions">
            <button className="primary" disabled={outOfStock} onClick={()=>onAdd(p)}><ShoppingBag size={18}/> {outOfStock?"Hết hàng":"Thêm vào giỏ"}</button>
            <button className={`secondary wish-btn${wished?" active":""}`} onClick={()=>onWish(p.id)}><Heart size={18} fill={wished?"currentColor":"none"}/> {wished?"Đã yêu thích":"Yêu thích"}</button>
          </div>
        </div>
      </div>
      <div className="reviews-section">
        <div className="section-head">
          <div><span className="eyebrow">ĐÁNH GIÁ SẢN PHẨM</span><h2>Bình luận &amp; đánh giá</h2></div>
          <div className="rating reviews-avg"><Star size={16} fill="currentColor"/>{avgRating}<span>{reviews.length} đánh giá</span></div>
        </div>
        <div className="reviews-grid">
          <form className="review-form contact-form" onSubmit={submitReview}>
            <label>Tên của bạn<input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên của bạn"/></label>
            <label>Đánh giá
              <div className="star-picker">
                {[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>setRating(n)} aria-label={`${n} sao`}><Star size={20} fill={n<=rating?"currentColor":"none"}/></button>)}
              </div>
            </label>
            <label>Nội dung<textarea rows={4} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."></textarea></label>
            <button className="primary" type="submit">Gửi đánh giá</button>
          </form>
          <div className="review-list">
            {reviews.map(r=><div className="review-card" key={r.id}>
              <div className="review-head">
                <span className="avatar">{r.name.trim().split(" ").map(x=>x[0]).slice(-2).join("").toUpperCase()}</span>
                <div><b>{r.name}</b><small>{new Date(r.date).toLocaleDateString("vi-VN")}</small></div>
                <div className="review-stars">{[1,2,3,4,5].map(n=><Star key={n} size={13} fill={n<=r.rating?"currentColor":"none"}/>)}</div>
              </div>
              <p>{r.comment}</p>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </main>
}

function Login({admin=false}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState("");
  const [mode,setMode]=useState("login");
  const [fullName,setFullName]=useState("");
  const register=!admin && mode==="register";
  const forgot=mode==="forgot";
  const [info,setInfo]=useState("");

  const submit=async e=>{
    e.preventDefault();
    if(forgot){
      if(!email.trim()){ setError("Vui lòng nhập email"); return; }
      try{
        const r=await api("/auth/forgot-password",{method:"POST",body:{email:email.trim()}});
        setInfo(r.message);
      }catch(err){ setError(err.message); }
      return;
    }
    if(!email.trim() || !password.trim() || (register && !fullName.trim())){ setError("Vui lòng nhập đầy đủ thông tin"); return; }
    try{
      const data=await api(admin ? "/auth/admin/login" : register ? "/auth/register" : "/auth/login",{method:"POST",body:{email:email.trim(),password,name:fullName.trim()}});
      setSession(admin ? "admin" : "customer", data);
      window.location.href=admin ? "/admin" : "/";
    }catch(err){ setError(err.message); }
  };

  return <main className="login-page">
    <div className="login-visual">
      <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=90"/>
      <div className="login-visual-overlay"><span className="eyebrow">{admin ? "HAI ADMIN" : "HAI MEMBER"}</span><h1>{admin ? "Quản trị" : "Chào mừng trở lại"}</h1><p>{admin ? "Quản lý cửa hàng, đơn hàng và sản phẩm trong một không gian trực quan." : "Đăng nhập để theo dõi đơn hàng và tận hưởng trải nghiệm mua sắm dành riêng cho bạn."}</p></div>
    </div>
    <section className="login-card-wrap">
      {admin&&<a href="/" className="text-link back-home"><ChevronLeft size={16}/> Về trang chủ</a>}
      <a href={admin ? "/" : "/"} className="logo login-logo"><span className="logo-mark">H</span>HAI</a>
      <div className="login-card">
        <div className="login-heading"><span className="eyebrow">{admin ? "ADMIN ACCESS" : "WELCOME BACK"}</span><h2>{admin ? "Đăng nhập quản trị" : "Đăng nhập tài khoản"}</h2><p>{admin ? "Đăng nhập bằng tài khoản quản trị" : forgot ? "Nhập email để nhận liên kết đặt lại mật khẩu" : register ? "Tạo tài khoản để bắt đầu mua sắm" : "Nhập thông tin tài khoản để tiếp tục mua sắm"}</p></div>
        <form onSubmit={submit} className="login-form">
          {register&&<label>Họ tên<input value={fullName} onChange={e=>{setFullName(e.target.value);setError("")}} placeholder="Nguyễn Văn A" autoComplete="name"/></label>}
          <label>Email hoặc tài khoản<input autoFocus value={email} onChange={e=>{setEmail(e.target.value);setError("")}} placeholder={admin ? "admin@hai.vn" : "you@example.com"} autoComplete="username"/></label>
          {!forgot&&<label>Mật khẩu<div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={e=>{setPassword(e.target.value);setError("")}} placeholder="••••••••" autoComplete={register ? "new-password" : "current-password"}/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword ? "Ẩn" : "Hiện"}</button></div></label>}
          {error&&<div className="login-error">{error}</div>}
          {info&&<div className="login-error" style={{background:"#edf5e7",color:"#648044"}}>{info}</div>}
          <div className="login-options"><label className="remember"><input type="checkbox"/> Ghi nhớ đăng nhập</label>{!forgot&&<a href="#" onClick={e=>{e.preventDefault();setMode("forgot");setError("");setInfo("")}}>Quên mật khẩu?</a>}</div>
          <button className="primary login-submit" type="submit">{forgot ? "Gửi liên kết" : register ? "Tạo tài khoản" : "Đăng nhập"} <ArrowRight size={18}/></button>
        </form>
        {forgot&&<p className="login-switch"><a href="#" onClick={e=>{e.preventDefault();setMode("login");setError("");setInfo("")}}>Quay lại đăng nhập</a></p>}
        {!admin&&!forgot&&<p className="login-switch">{register ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <a href="#" onClick={e=>{e.preventDefault();setMode(register?"login":"register");setError("")}}>{register ? "Đăng nhập" : "Tạo tài khoản"}</a></p>}
        {admin&&<p className="login-switch">Khu vực dành riêng cho quản trị viên</p>}
      </div>
    </section>
  </main>
}

function Customer({cart,setCart,customerAuthed}){
  const [toast,setToast]=useState("");
  const [showLoginPrompt,setShowLoginPrompt]=useState(false);
  const [wishlist,setWishlist]=useLocalState("hai_wishlist",[]);
  const [lastOrder,setLastOrder]=useLocalState("hai_last_order",null);
  const {data:catalog,reload:reloadCatalog}=useFetch("/products",[]);
  const products=useMemo(()=>catalog.map(({stock:_s,...p})=>p),[catalog]);
  const stock=useMemo(()=>Object.fromEntries(catalog.map(p=>[p.id,p.stock])),[catalog]);
  const add=p=>{
    if(!customerAuthed){ setShowLoginPrompt(true); return; }
    const available=stock[p.id];
    const inCart=cart.find(x=>x.id===p.id)?.qty||0;
    if(available!==undefined && inCart>=available){
      setToast(`${p.name} đã hết hàng`);setTimeout(()=>setToast(""),1800);
      return;
    }
    setCart(c=>{
      const found=c.find(x=>x.id===p.id);
      if(found) return c.map(x=>x.id===p.id ? {...x,qty:x.qty+1} : x);
      return [...c,{...p,qty:1}];
    });
    setToast(`${p.name} đã thêm vào giỏ`);setTimeout(()=>setToast(""),1800);
  };
  const setQty=(id,qty)=>setCart(c=> qty<=0 ? c.filter(x=>x.id!==id) : c.map(x=>x.id===id ? {...x,qty} : x));
  const removeFromCart=id=>setCart(c=>c.filter(x=>x.id!==id));
  const cartCount=cart.reduce((s,p)=>s+p.qty,0);
  const checkout=async(total,items,code)=>{
    if(!items.length) return;
    try{
      const order=await api("/orders",{method:"POST",body:{items:items.map(p=>({id:p.id,qty:p.qty})),code}});
      setLastOrder(order);
      setCart([]);
      reloadCatalog();
      window.location.hash="#/order-success";
    }catch(err){
      setToast(err.message);setTimeout(()=>setToast(""),2500);
      reloadCatalog();
    }
  };
  const toggleWish=id=>setWishlist(w=>w.includes(id) ? w.filter(x=>x!==id) : [...w,id]);
  const route=useHashRoute();
  const isShop=route.startsWith("#/shop");
  const isProduct=route.startsWith("#/product/");
  const isWishlist=route.startsWith("#/wishlist");
  const isAbout=route.startsWith("#/about");
  const isContact=route.startsWith("#/contact");
  const isCart=route.startsWith("#/cart");
  const isOrderSuccess=route.startsWith("#/order-success");
  const isProfile=route.startsWith("#/profile");
  const isOrders=route.startsWith("#/orders");
  const params=new URLSearchParams(route.split("?")[1]||"");
  const category=params.get("cat");
  const q=(params.get("q")||"").trim();
  const page=Math.max(1,parseInt(params.get("page"),10)||1);
  const visible=useMemo(()=>products.filter(p=>(!category||p.category===category)&&matchQuery(p,q)),[products,category,q]);
  const logout=()=>{clearSession("customer");window.location.href="/"};

  return <div>
    <Header cartCount={cartCount} wishCount={wishlist.length} onLogout={logout} customerAuthed={customerAuthed} query={isShop?q:""}/>
    {isProduct
      ? <ProductDetail id={route.split("/product/")[1]} products={products} onAdd={add} onWish={toggleWish} wished={wishlist.includes(Number(route.split("/product/")[1]))} stock={stock[Number(route.split("/product/")[1])]}/>
      : isOrderSuccess
      ? <OrderSuccess order={lastOrder}/>
      : isOrders
      ? (customerAuthed ? <MyOrders products={products}/> : <LoginPrompt close={()=>{window.location.hash="#/"}}/>)
      : isProfile
      ? (customerAuthed ? <Profile lastOrder={lastOrder}/> : <LoginPrompt close={()=>{window.location.hash="#/"}}/>)
      : isCart
      ? <CartPage cart={cart} setQty={setQty} removeFromCart={removeFromCart} onCheckout={checkout}/>
      : isWishlist
      ? <Wishlist items={products.filter(p=>wishlist.includes(p.id))} onAdd={add} onWish={toggleWish} wishlist={wishlist} stock={stock}/>
      : isAbout
      ? <About/>
      : isContact
      ? <Contact/>
      : !isShop ? <Home products={products} onAdd={add} onWish={toggleWish} wishlist={wishlist} stock={stock}/> : <Shop products={visible} category={category} q={q} page={page} onAdd={add} onWish={toggleWish} wishlist={wishlist} stock={stock}/>}
    {toast&&<div className="toast"><Check size={18}/>{toast}</div>}
    {showLoginPrompt&&<LoginPrompt close={()=>setShowLoginPrompt(false)}/>}
  </div>
}

function OrderSuccess({order}){
  if(!order) return <main className="shop-page"><div className="container"><div className="empty"><h3>Không có đơn hàng nào</h3><p>Có vẻ bạn vào thẳng trang này.</p><a href="#/shop" className="primary">Về cửa hàng</a></div></div></main>;
  return <main className="shop-page"><div className="container">
    <div className="order-success">
      <div className="order-success-icon"><Check size={32}/></div>
      <h1>Đặt hàng thành công!</h1>
      <p>Cảm ơn bạn đã mua hàng tại HAI. Đơn hàng của bạn đang được xử lý.</p>
      <div className="order-success-box">
        <div><span>Mã đơn hàng</span><b>#{order.id}</b></div>
        <div><span>Số sản phẩm</span><b>{order.count}</b></div>
        <div><span>Tổng thanh toán</span><b>{money(order.total)}</b></div>
      </div>
      <div className="order-success-actions">
        <a href="#/shop" className="primary">Tiếp tục mua sắm</a>
        <a href="#/orders" className="secondary">Đơn hàng của tôi</a>
        <a href="#/" className="secondary">Về trang chủ</a>
      </div>
    </div>
  </div></main>
}

const ORDER_FILTERS=["Tất cả","Chờ xử lý","Đang giao","Đã giao"];

function MyOrders({products}){
  const {data:orders,loading,error,reload}=useFetch("/orders/mine",[]);
  const [filter,setFilter]=useState("Tất cả");
  const byId=useMemo(()=>Object.fromEntries(products.map(p=>[p.id,p])),[products]);
  const statusClass=st=>st==="Đã giao"?"done":st==="Đang giao"?"shipping":"";
  const list=orders.filter(o=>filter==="Tất cả"||(o.status||"Chờ xử lý")===filter);
  return <main className="shop-page"><div className="container">
    <div className="shop-top"><div><span className="eyebrow">TÀI KHOẢN CỦA BẠN</span><h1>Đơn hàng của tôi</h1><p>{loading?"Đang tải...":`${orders.length} đơn hàng`}</p></div></div>
    <div className="category-pills">{ORDER_FILTERS.map(f=><a key={f} href="#/orders" className={filter===f?"active":""} onClick={e=>{e.preventDefault();setFilter(f)}}>{f}{f!=="Tất cả"&&orders.length>0?` (${orders.filter(o=>(o.status||"Chờ xử lý")===f).length})`:""}</a>)}</div>
    {error
      ? <div className="empty"><h3>Không tải được đơn hàng</h3><p>{error}</p><button className="primary" onClick={reload}>Thử lại</button></div>
      : !loading && !list.length
      ? <div className="empty"><Package size={42}/><h3>{orders.length?"Không có đơn hàng ở trạng thái này":"Bạn chưa có đơn hàng nào"}</h3><p>{orders.length?"Chọn trạng thái khác để xem các đơn còn lại.":"Hãy chọn vài món đồ ưng ý nhé."}</p><a href="#/shop" className="primary">Mua sắm ngay</a></div>
      : <div className="orders-list">{list.map(o=>{
          const st=o.status||"Chờ xử lý";
          return <div className="panel" key={o.id}>
            <div className="order-card-head">
              <div><b>#{o.id}</b><small>{new Date(o.date).toLocaleString("vi-VN")} · {o.count} sản phẩm</small></div>
              <span className={`status ${statusClass(st)}`}>{st}</span>
            </div>
            {o.items.map(it=>{
              const prod=byId[it.id];
              return <div className="order-line" key={it.id}>
                {prod ? <a href={`#/product/${it.id}`}><img src={prod.image} alt={it.name}/></a> : <div className="order-line-ph"><Package size={20}/></div>}
                <div>{prod ? <a href={`#/product/${it.id}`}><b>{it.name}</b></a> : <b>{it.name}</b>}<small>{money(it.price)} × {it.qty}</small></div>
                <strong>{money(it.price*it.qty)}</strong>
              </div>
            })}
            <div className="order-totals">
              <div><span>Tạm tính</span><span>{money(o.subtotal)}</span></div>
              {o.discount>0 && <div><span>Giảm giá{o.promoCode?` (${o.promoCode})`:""}</span><span>-{money(o.discount)}</span></div>}
              <div><span>Phí vận chuyển</span><span>{o.shipping>0?money(o.shipping):"Miễn phí"}</span></div>
              <div className="total"><span>Tổng thanh toán</span><span>{money(o.total)}</span></div>
            </div>
          </div>
        })}</div>}
  </div></main>
}

function Wishlist({items,onAdd,onWish,wishlist,stock}){
  return <main className="shop-page"><div className="container">
    <div className="shop-top"><div><span className="eyebrow">DANH SÁCH CỦA BẠN</span><h1>Sản phẩm yêu thích</h1><p>{items.length} sản phẩm</p></div></div>
    {!items.length
      ? <div className="empty wishlist-empty"><Heart size={42}/><h3>Chưa có sản phẩm yêu thích</h3><p>Bấm biểu tượng trái tim trên sản phẩm để lưu vào đây.</p><a href="#/shop" className="primary">Khám phá cửa hàng</a></div>
      : <div className="product-grid">{items.map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onWish={onWish} wished={wishlist.includes(p.id)} stock={stock?.[p.id]}/>)}</div>}
  </div></main>
}

function About(){
  return <main className="info-page">
    <section className="hero info-hero"><div className="container"><span className="eyebrow">VỀ CHÚNG TÔI</span><h1>Câu chuyện của HAI</h1><p>HAI ra đời với mong muốn mang đến những sản phẩm thời trang và phụ kiện tối giản, chất lượng, phù hợp với nhịp sống hiện đại.</p></div></section>
    <section className="section"><div className="container info-grid">
      <div><h3>Sứ mệnh</h3><p>Chọn lọc kỹ lưỡng từng sản phẩm, ưu tiên chất liệu bền và thiết kế tinh gọn thay vì chạy theo xu hướng ngắn hạn.</p></div>
      <div><h3>Giá trị cốt lõi</h3><p>Minh bạch về chất lượng, giá cả hợp lý và trải nghiệm mua sắm nhanh gọn, thân thiện.</p></div>
      <div><h3>Cam kết</h3><p>Giao hàng nhanh trong 48h, đổi trả dễ dàng và hỗ trợ khách hàng tận tâm.</p></div>
    </div></section>
  </main>
}

function Contact(){
  return <main className="info-page">
    <section className="hero info-hero"><div className="container"><span className="eyebrow">LIÊN HỆ</span><h1>Chúng tôi luôn sẵn sàng hỗ trợ</h1><p>Có câu hỏi về sản phẩm hoặc đơn hàng? Gửi cho chúng tôi vài dòng, đội ngũ HAI sẽ phản hồi sớm nhất.</p></div></section>
    <section className="section"><div className="container contact-grid">
      <form className="contact-form" onSubmit={e=>e.preventDefault()}>
        <label>Họ tên<input placeholder="Tên của bạn"/></label>
        <label>Email<input type="email" placeholder="you@example.com"/></label>
        <label>Nội dung<textarea rows={5} placeholder="Bạn cần hỗ trợ điều gì?"></textarea></label>
        <button className="primary" type="submit">Gửi liên hệ <ArrowRight size={18}/></button>
      </form>
      <div className="contact-info">
        <div><b>Email</b><p>hotro@hai.vn</p></div>
        <div><b>Hotline</b><p>1900 8888</p></div>
        <div><b>Địa chỉ</b><p>123 Đường Nguyễn Văn Linh, Đà Nẵng</p></div>
      </div>
    </div></section>
  </main>
}

function LoginPrompt({close}){
  return <div className="modal-bg">
    <div className="modal">
      <div className="modal-head"><div><span className="eyebrow">YÊU CẦU ĐĂNG NHẬP</span><h2>Vui lòng đăng nhập</h2></div><button className="icon-btn" onClick={close}><X/></button></div>
      <p>Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.</p>
      <div className="modal-actions"><button className="secondary" onClick={close}>Để sau</button><a className="primary" href="/login">Đăng nhập ngay</a></div>
    </div>
  </div>
}

function Profile({lastOrder}){
  const savedEmail=(typeof window!=="undefined" && localStorage.getItem("hai_customer_email")) || "";
  const savedName=(typeof window!=="undefined" && localStorage.getItem("hai_customer_name")) || (savedEmail ? savedEmail.split("@")[0] : "");
  const [name,setName]=useState(savedName);
  const [email,setEmail]=useState(savedEmail);
  const [phone,setPhone]=useState("");
  const [address,setAddress]=useState("");
  const [saved,setSaved]=useState(false);
  const initials=(name||"H").trim().split(" ").map(x=>x[0]).slice(-2).join("").toUpperCase();
  useEffect(()=>{ api("/auth/me").then(u=>{setName(u.name);setEmail(u.email);setPhone(u.phone||"");setAddress(u.address||"")}).catch(()=>{}); },[]);
  const save=async e=>{
    e.preventDefault();
    try{
      const u=await api("/auth/me",{method:"PUT",body:{name,phone,address}});
      localStorage.setItem("hai_customer_name",u.name);
      setSaved(true);setTimeout(()=>setSaved(false),1800);
    }catch(err){ alert(err.message); }
  };
  return <main className="shop-page"><div className="container">
    <div className="shop-top"><div><span className="eyebrow">TÀI KHOẢN CỦA BẠN</span><h1>Hồ sơ cá nhân</h1><p>Quản lý thông tin cá nhân và theo dõi đơn hàng gần nhất</p></div></div>
    <div className="admin-grid">
      <div className="panel">
        <div className="panel-head"><div><b>Thông tin cá nhân</b><span>Cập nhật thông tin liên hệ của bạn</span></div></div>
        <div className="admin-user" style={{marginBottom:22}}><span className="avatar" style={{width:52,height:52,fontSize:16}}>{initials}</span><div><b style={{fontSize:15}}>{name||"Khách hàng HAI"}</b><small>{email||"Chưa có email"}</small></div></div>
        <form onSubmit={save} className="login-form">
          <label>Họ tên<input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên của bạn"/></label>
          <label>Email<input type="email" value={email} disabled placeholder="you@example.com"/></label>
          <label>Số điện thoại<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0901 234 567"/></label>
          <label>Địa chỉ giao hàng<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Số nhà, đường, quận/thành phố"/></label>
          <button className="primary login-submit" type="submit">Lưu thay đổi</button>
          {saved&&<div className="login-error" style={{background:"#edf5e7",color:"#648044"}}>Đã lưu thông tin</div>}
        </form>
      </div>
      <div>
        <div className="panel" style={{marginBottom:18}}>
          <div className="panel-head"><div><b>Đơn hàng gần nhất</b><span>{lastOrder ? "Đơn hàng vừa đặt" : "Chưa có đơn hàng"}</span></div><a href="#/orders">Xem tất cả</a></div>
          {lastOrder
            ? <div className="order-mini"><div className="avatar">{initials}</div><div><b>#{lastOrder.id}</b><small>{lastOrder.count} sản phẩm</small></div><strong>{money(lastOrder.total)}</strong><span className="status done">Đã đặt</span></div>
            : <p className="muted" style={{margin:0}}>Bạn chưa có đơn hàng nào gần đây.</p>}
        </div>
        <div className="panel">
          <div className="panel-head"><div><b>Liên hệ hỗ trợ</b></div></div>
          <div className="contact-info">
            <div><b>Email</b><p>hotro@hai.vn</p></div>
            <div><b>Hotline</b><p>1900 8888</p></div>
          </div>
        </div>
        <ChangePassword/>
      </div>
    </div>
  </div></main>
}

function ChangePassword(){
  const [cur,setCur]=useState("");
  const [next,setNext]=useState("");
  const [again,setAgain]=useState("");
  const [msg,setMsg]=useState(null);
  const submit=async e=>{
    e.preventDefault();
    if(next!==again){ setMsg({ok:false,text:"Mật khẩu nhập lại không khớp"}); return; }
    try{
      const {token}=await api("/auth/change-password",{method:"POST",body:{currentPassword:cur,newPassword:next}});
      setToken("customer",token);
      setCur("");setNext("");setAgain("");
      setMsg({ok:true,text:"Đã đổi mật khẩu"});
    }catch(err){ setMsg({ok:false,text:err.message}); }
  };
  return <div className="panel" style={{marginTop:18}}>
    <div className="panel-head"><div><b>Đổi mật khẩu</b><span>Tối thiểu 6 ký tự. Các thiết bị khác sẽ bị đăng xuất</span></div></div>
    <form onSubmit={submit} className="login-form">
      <label>Mật khẩu hiện tại<input type="password" value={cur} onChange={e=>{setCur(e.target.value);setMsg(null)}} autoComplete="current-password"/></label>
      <label>Mật khẩu mới<input type="password" value={next} onChange={e=>{setNext(e.target.value);setMsg(null)}} autoComplete="new-password"/></label>
      <label>Nhập lại mật khẩu mới<input type="password" value={again} onChange={e=>{setAgain(e.target.value);setMsg(null)}} autoComplete="new-password"/></label>
      <button className="primary login-submit" type="submit" disabled={!cur||!next||!again}>Cập nhật mật khẩu</button>
      {msg&&<div className="login-error" style={msg.ok?{background:"#edf5e7",color:"#648044"}:undefined}>{msg.text}</div>}
    </form>
  </div>
}

function ResetPassword(){
  const token=new URLSearchParams(window.location.search).get("token")||"";
  const [password,setPassword]=useState("");
  const [again,setAgain]=useState("");
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const submit=async e=>{
    e.preventDefault();
    if(password!==again){ setError("Mật khẩu nhập lại không khớp"); return; }
    try{ await api("/auth/reset-password",{method:"POST",body:{token,password}}); setDone(true); }
    catch(err){ setError(err.message); }
  };
  return <main className="login-page" style={{gridTemplateColumns:"1fr"}}>
    <section className="login-card-wrap">
      <a href="/" className="logo login-logo"><span className="logo-mark">H</span>HAI</a>
      <div className="login-card">
        <div className="login-heading"><span className="eyebrow">RESET PASSWORD</span><h2>Đặt lại mật khẩu</h2><p>{done ? "Mật khẩu đã được cập nhật." : "Nhập mật khẩu mới cho tài khoản của bạn"}</p></div>
        {done
          ? <a className="primary login-submit" href="/login">Đến trang đăng nhập <ArrowRight size={18}/></a>
          : !token
          ? <div className="login-error">Liên kết không hợp lệ</div>
          : <form onSubmit={submit} className="login-form">
              <label>Mật khẩu mới<input type="password" autoFocus value={password} onChange={e=>{setPassword(e.target.value);setError("")}} autoComplete="new-password"/></label>
              <label>Nhập lại mật khẩu<input type="password" value={again} onChange={e=>{setAgain(e.target.value);setError("")}} autoComplete="new-password"/></label>
              {error&&<div className="login-error">{error}</div>}
              <button className="primary login-submit" type="submit" disabled={!password||!again}>Đặt lại mật khẩu <ArrowRight size={18}/></button>
            </form>}
      </div>
    </section>
  </main>
}

function Home({products,onAdd,onWish,wishlist,stock}){
  return <>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow">NEW SEASON · 2026</span><h1>Đơn giản.<br/><em>Khác biệt.</em></h1><p>Những món đồ được chọn lọc cho nhịp sống hiện đại — thiết kế tinh gọn, chất lượng vượt mong đợi.</p><div className="hero-actions"><a href="#/shop" className="primary">Khám phá bộ sưu tập <ArrowRight size={18}/></a><a href="#/shop?cat=Giày" className="text-link">Xem sản phẩm bán chạy</a></div><div className="hero-stats"><div><b>12K+</b><span>Khách hàng</span></div><div><b>4.9/5</b><span>Đánh giá</span></div><div><b>48h</b><span>Giao hàng</span></div></div></div><div className="hero-visual"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=90"/><div className="floating-card"><span>Editor's pick</span><b>Aero Runner</b><small>1.890.000₫</small></div></div></div></section>
    <section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow">CURATED FOR YOU</span><h2>Sản phẩm nổi bật</h2></div><a href="#/shop" className="text-link">Xem tất cả <ArrowRight size={16}/></a></div><div className="product-grid">{products.filter(p=>(stock?.[p.id]??1)>0).slice(0,4).map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onWish={onWish} wished={wishlist.includes(p.id)} stock={stock?.[p.id]}/>)}</div></div></section>
    <section className="banner"><div className="container banner-inner"><div><span className="eyebrow">HAI MEMBER</span><h2>Đặc quyền dành riêng cho bạn</h2><p>Đăng ký thành viên để nhận ưu đãi 10% cho đơn hàng đầu tiên.</p></div><button className="primary">Trở thành thành viên <ArrowRight size={18}/></button></div></section>
    <footer><div className="container footer-grid"><div><a className="logo"><span className="logo-mark">H</span>HAI</a><p>Modern essentials for modern life.</p></div><div><b>Mua sắm</b><a href="#/shop">Tất cả sản phẩm</a><a href="#/shop?cat=Thời%20trang">Thời trang</a><a href="#/shop?cat=Giày">Giày</a></div><div><b>Hỗ trợ</b><a>Chính sách đổi trả</a><a>Vận chuyển</a><a>Liên hệ</a></div><div><b>Admin</b><span className="footer-static">Quản trị cửa hàng</span></div></div></footer>
  </>
}

function ShopFilters({priceRange,setPriceRange,ratingMin,setRatingMin}){
  const ranges=[
    {label:"Dưới 500.000₫",min:0,max:500000},
    {label:"500.000₫ - 1.000.000₫",min:500000,max:1000000},
    {label:"1.000.000₫ - 2.000.000₫",min:1000000,max:2000000},
    {label:"Trên 2.000.000₫",min:2000000,max:Infinity}
  ];
  const isActiveRange=r=>priceRange && priceRange.min===r.min && priceRange.max===r.max;
  const ratings=[4.5,4,3.5];
  const hasFilter=priceRange || ratingMin>0;
  return <aside className="shop-filters">
    <div className="filter-head"><Filter size={16}/><b>Bộ lọc tìm kiếm</b></div>
    <div className="filter-group">
      <div className="filter-title">Khoảng giá</div>
      {ranges.map(r=><label key={r.label} className="filter-check"><input type="checkbox" checked={!!isActiveRange(r)} onChange={()=>setPriceRange(isActiveRange(r)?null:r)}/>{r.label}</label>)}
    </div>
    <div className="filter-group">
      <div className="filter-title">Đánh giá</div>
      {ratings.map(r=><label key={r} className="filter-check"><input type="checkbox" checked={ratingMin===r} onChange={()=>setRatingMin(ratingMin===r?0:r)}/>Từ {r} sao trở lên</label>)}
    </div>
    {hasFilter && <button className="filter-clear" onClick={()=>{setPriceRange(null);setRatingMin(0)}}>Xóa lọc</button>}
  </aside>
}

function Pagination({page,totalPages,hrefFor}){
  if(totalPages<=1) return null;
  const nums=[];
  for(let i=1;i<=totalPages;i++){
    if(i===1||i===totalPages||Math.abs(i-page)<=1) nums.push(i);
    else if(nums[nums.length-1]!=="…") nums.push("…");
  }
  const top=()=>window.scrollTo({top:0,behavior:"smooth"});
  return <nav className="pagination" aria-label="Phân trang">
    {page>1 ? <a href={hrefFor(page-1)} onClick={top} title="Trang trước"><ChevronLeft size={16}/></a> : <span className="disabled"><ChevronLeft size={16}/></span>}
    {nums.map((n,i)=>n==="…" ? <span key={"e"+i} className="dots">…</span> : <a key={n} href={hrefFor(n)} onClick={top} className={n===page?"active":""} aria-current={n===page?"page":undefined}>{n}</a>)}
    {page<totalPages ? <a href={hrefFor(page+1)} onClick={top} title="Trang sau"><ChevronRight size={16}/></a> : <span className="disabled"><ChevronRight size={16}/></span>}
  </nav>
}

function Shop({products:items,category,q="",page=1,onAdd,onWish,wishlist,stock}){
  const [sort,setSort]=useState("featured");
  const [priceRange,setPriceRange]=useState(null);
  const [ratingMin,setRatingMin]=useState(0);
  const filtered=items.filter(p=>(stock?.[p.id]??1)>0 && (!priceRange || (p.price>=priceRange.min && p.price<=priceRange.max)) && p.rating>=ratingMin);
  const sorted=[...filtered].sort((a,b)=>sort==="low"?a.price-b.price:sort==="high"?b.price-a.price:0);
  const totalPages=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE));
  const cur=Math.min(page,totalPages);
  const pageItems=sorted.slice((cur-1)*PAGE_SIZE,cur*PAGE_SIZE);
  const hrefFor=n=>shopHref({cat:category,q,page:n});
  const backToFirst=()=>{ if(page>1) window.location.hash=hrefFor(1); };
  return <main className="shop-page"><div className="container">
    <div className="shop-top"><div><span className="eyebrow">{q?"SEARCH":"SHOP"}</span><h1>{q?`Kết quả cho “${q}”`:(category||"Tất cả sản phẩm")}</h1><p>{q?`Tìm thấy ${sorted.length} sản phẩm`:`${sorted.length} sản phẩm được tuyển chọn`}{q && <> · <a className="text-link inline" href={shopHref({cat:category})}>Xóa tìm kiếm</a></>}</p></div><select value={sort} onChange={e=>{setSort(e.target.value);backToFirst()}}><option value="featured">Nổi bật</option><option value="low">Giá thấp → cao</option><option value="high">Giá cao → thấp</option></select></div>
    <div className="shop-layout">
      <ShopFilters priceRange={priceRange} setPriceRange={v=>{setPriceRange(v);backToFirst()}} ratingMin={ratingMin} setRatingMin={v=>{setRatingMin(v);backToFirst()}}/>
      <div className="shop-content">
        <div className="category-pills"><a href={shopHref({q})} className={!category?"active":""}>Tất cả</a>{["Thời trang","Giày","Phụ kiện"].map(c=><a className={category===c?"active":""} key={c} href={shopHref({cat:c,q})}>{c}</a>)}</div>
        <div className="product-grid">{pageItems.map(p=><ProductCard key={p.id} p={p} onAdd={onAdd} onWish={onWish} wished={wishlist.includes(p.id)} stock={stock?.[p.id]}/>)}</div>
        {!sorted.length && <p className="filter-empty">{q?`Không tìm thấy sản phẩm nào cho “${q}”. Thử từ khóa khác nhé.`:"Không có sản phẩm phù hợp với bộ lọc."}</p>}
        <Pagination page={cur} totalPages={totalPages} hrefFor={hrefFor}/>
      </div>
    </div>
  </div></main>
}

function CartPage({cart,setQty,removeFromCart,onCheckout}){
  const [code,setCode]=useState("");
  const [applied,setApplied]=useState(null);
  const [codeMsg,setCodeMsg]=useState("");
  const subtotal=cart.reduce((s,p)=>s+p.price*p.qty,0);
  const shipping=subtotal>0 && subtotal<1000000 ? 30000 : 0;
  const discount=applied ? Math.round(subtotal*applied.percent/100) : 0;
  const total=Math.max(subtotal-discount,0)+shipping;

  const applyCode=()=>{
    const known={"HAI10":10,"FREESHIP":0};
    const key=code.trim().toUpperCase();
    if(!key){ return; }
    if(key==="FREESHIP"){ setApplied({code:key,percent:0,freeship:true}); setCodeMsg("Đã áp dụng miễn phí vận chuyển"); return; }
    if(known[key]!==undefined){ setApplied({code:key,percent:known[key]}); setCodeMsg(`Đã áp dụng mã giảm ${known[key]}%`); }
    else { setApplied(null); setCodeMsg("Mã giảm giá không hợp lệ"); }
  };

  const finalShipping = applied?.freeship ? 0 : shipping;
  const finalTotal = Math.max(subtotal-discount,0)+finalShipping;

  return <main className="shop-page cart-page"><div className="container">
    <div className="shop-top"><div><span className="eyebrow">YOUR BAG</span><h1>Giỏ hàng ({cart.reduce((s,p)=>s+p.qty,0)})</h1></div><a href="#/shop" className="text-link"><ChevronLeft size={16}/> Tiếp tục mua sắm</a></div>

    {!cart.length
      ? <div className="empty cart-empty"><ShoppingBag size={42}/><h3>Giỏ hàng đang trống</h3><p>Thêm một vài món yêu thích của bạn nhé.</p><a href="#/shop" className="primary">Tiếp tục mua sắm</a></div>
      : <div className="cart-layout">
          <div className="cart-list">
            {cart.map(p=><div className="cart-row" key={p.id}>
              <img src={p.image}/>
              <div className="cart-row-info">
                <a href={`#/product/${p.id}`}><b>{p.name}</b></a>
                <span>{p.category}</span>
                <strong>{money(p.price)}</strong>
              </div>
              <div className="qty-control">
                <button onClick={()=>setQty(p.id,p.qty-1)}>−</button>
                <span>{p.qty}</span>
                <button onClick={()=>setQty(p.id,p.qty+1)}>+</button>
              </div>
              <div className="cart-row-total">{money(p.price*p.qty)}</div>
              <button className="cart-row-remove" onClick={()=>removeFromCart(p.id)}><Trash2 size={16}/></button>
            </div>)}
          </div>

          <aside className="cart-summary-panel">
            <h2>Tóm tắt đơn hàng</h2>
            <div className="promo-row">
              <input placeholder="Nhập mã giảm giá" value={code} onChange={e=>setCode(e.target.value)}/>
              <button className="secondary" onClick={applyCode}>Áp dụng</button>
            </div>
            {codeMsg&&<div className={`promo-msg${applied?" ok":""}`}>{codeMsg}</div>}
            <div className="cart-summary">
              <div><span>Tạm tính</span><b>{money(subtotal)}</b></div>
              {discount>0&&<div><span>Giảm giá ({applied.code})</span><b>-{money(discount)}</b></div>}
              <div><span>Phí vận chuyển</span><b>{finalShipping===0?"Miễn phí":money(finalShipping)}</b></div>
              {shipping>0 && !applied?.freeship && <div className="promo-hint">Mua thêm {money(1000000-subtotal)} để được miễn phí vận chuyển</div>}
              <div className="total"><span>Tổng cộng</span><b>{money(finalTotal)}</b></div>
            </div>
            <button className="primary full" disabled={!cart.length} onClick={()=>onCheckout(finalTotal,cart,applied?.code)}>Thanh toán <ArrowRight size={18}/></button>
          </aside>
        </div>}
  </div></main>
}

function Admin(){
  const [section,setSection]=useState("overview");
  const [notice,setNotice]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const {data:catalog,reload:reloadCatalog}=useFetch("/products",[],true);
  const inventory=useMemo(()=>catalog.map(({stock:_s,...p})=>p),[catalog]);
  const stock=useMemo(()=>Object.fromEntries(catalog.map(p=>[p.id,p.stock])),[catalog]);
  const nav=[
    ["overview","Tổng quan",LayoutDashboard],["orders","Đơn hàng",ShoppingBag],["products","Sản phẩm",Package],["customers","Khách hàng",Users],["analytics","Phân tích",BarChart3]
  ];
  return <div className="admin-shell"><aside className="admin-side"><a href="#/" className="logo admin-logo"><span className="logo-mark">H</span>HAI</a><div className="admin-label">QUẢN TRỊ</div>{nav.map(([id,label,Icon])=><button key={id} className={section===id?"admin-nav active":"admin-nav"} onClick={()=>setSection(id)}><Icon size={18}/>{label}</button>)}<div className="side-bottom"><button className="admin-nav" onClick={()=>{clearSession("admin");window.location.href="/admin/login"}}><LogOut size={18}/>Đăng xuất</button></div></aside><main className="admin-main"><div className="admin-top"><div><span className="eyebrow">MONDAY · 11 SEPTEMBER 2026</span><h1>{nav.find(x=>x[0]===section)?.[1]}</h1></div><div className="admin-user"><button className="icon-btn"><Bell size={18}/></button></div></div>{section==="overview"&&<Dashboard inventory={inventory}/>} {section==="orders"&&<Orders/>}{section==="products"&&<Products inventory={inventory} stock={stock} reload={reloadCatalog} openAdd={()=>setShowAdd(true)}/>} {section==="customers"&&<Customers/>}{section==="analytics"&&<Analytics inventory={inventory}/>}</main>{showAdd&&<AddProduct close={()=>setShowAdd(false)} add={async(p,qty)=>{try{await api("/products",{method:"POST",admin:true,body:{...p,stock:qty}});reloadCatalog();setShowAdd(false);setNotice("Đã thêm sản phẩm mới")}catch(err){setNotice(err.message)}}}/>}{notice&&<div className="toast"><Check size={18}/>{notice}</div>}</div>
}

function monthKey(d){ return d.getFullYear()+"-"+(d.getMonth()+1); }

function Dashboard({inventory}){
  const {data:orders}=useFetch("/orders",[],true);
  const [metric,setMetric]=useState("revenue");
  const now=new Date();
  const months=[...Array(6)].map((_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
    return {label:"T"+(d.getMonth()+1),key:monthKey(d)};
  });
  const inMonth=k=>orders.filter(o=>monthKey(new Date(o.date))===k);
  const thisMonth=monthKey(now);
  const prevMonth=monthKey(new Date(now.getFullYear(),now.getMonth()-1,1));
  const ordersThisMonth=inMonth(thisMonth), ordersPrevMonth=inMonth(prevMonth);
  const revenue=orders.reduce((s,o)=>s+o.total,0);
  const revenueThisMonth=ordersThisMonth.reduce((s,o)=>s+o.total,0);
  const revenuePrevMonth=ordersPrevMonth.reduce((s,o)=>s+o.total,0);
  const uniqueCustomers=list=>new Set(list.map(o=>o.customerEmail||o.customerName)).size;
  const customers=uniqueCustomers(orders);
  const customersThisMonth=uniqueCustomers(ordersThisMonth);
  const customersPrevMonth=uniqueCustomers(ordersPrevMonth);
  const pct=(cur,prev)=>{
    if(prev>0) return `${cur>=prev?"+":""}${(((cur-prev)/prev)*100).toFixed(1)}%`;
    return cur>0 ? "Mới" : null;
  };
  const cards=[
    ["Doanh thu",money(revenue),pct(revenueThisMonth,revenuePrevMonth),TrendingUp],
    ["Đơn hàng",orders.length,pct(ordersThisMonth.length,ordersPrevMonth.length),ShoppingBag],
    ["Khách hàng",customers,pct(customersThisMonth,customersPrevMonth),Users],
    ["Sản phẩm",inventory.length,null,Package]
  ];
  const monthlyRevenue=months.map(m=>inMonth(m.key).reduce((s,o)=>s+o.total,0));
  const monthlyOrders=months.map(m=>inMonth(m.key).length);
  const chartData=metric==="revenue" ? monthlyRevenue : monthlyOrders;
  const maxChart=Math.max(...chartData,1);
  const recentOrders=[...orders].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);
  return <><div className="stat-grid">{cards.map(([t,v,g,I])=><div className="stat-card" key={t}><div className="stat-icon"><I size={19}/></div><span>{t}</span><h2>{v}</h2><small>{g?<><TrendingUp size={13}/> {g} <i>so với tháng trước</i></>:<i>Tổng số hiện tại</i>}</small></div>)}</div><div className="admin-grid"><div className="panel chart-panel"><div className="panel-head"><div><b>Doanh thu</b><span>6 tháng gần nhất</span></div><select value={metric} onChange={e=>setMetric(e.target.value)}><option value="revenue">Doanh thu</option><option value="orders">Đơn hàng</option></select></div><div className="bars">{months.map((m,i)=><div className="bar-wrap" key={m.key}><div className="bar" style={{height:`${chartData[i] ? Math.max((chartData[i]/maxChart)*100,4) : 2}%`}}></div><span>{m.label}</span></div>)}</div></div><div className="panel"><div className="panel-head"><div><b>Đơn hàng mới</b><span>Từ khách hàng thực tế</span></div></div>{recentOrders.length ? recentOrders.map(o=><OrderMini key={o.id} name={o.customerName||"Khách hàng"} code={"#"+o.id} price={money(o.total)} status={o.status||"Chờ xử lý"}/>) : <p className="muted" style={{margin:"6px 0 0"}}>Chưa có đơn hàng nào được đặt từ trang khách hàng.</p>}</div></div></>
}
function OrderMini({name,code,price,status}){return <div className="order-mini"><div className="avatar">{name.split(" ").map(x=>x[0]).slice(-2).join("")}</div><div><b>{name}</b><small>{code}</small></div><strong>{price}</strong><span className={`status ${status==="Đã giao"?"done":status==="Đang giao"?"shipping":""}`}>{status}</span></div>}

function Orders(){
  const {data:orders,setData:setOrders}=useFetch("/orders",[],true);
  const [statusFilter,setStatusFilter]=useState("all");
  const [daysFilter,setDaysFilter]=useState("all");
  const statusClass=s=>s==="Đã giao"?"done":s==="Đang giao"?"shipping":"";
  const updateStatus=(id,status)=>{
    const prev=orders;
    setOrders(list=>list.map(o=>o.id===id?{...o,status}:o));
    api(`/orders/${id}/status`,{method:"PATCH",admin:true,body:{status}}).catch(()=>setOrders(prev));
  };
  const now=Date.now();
  const filtered=orders.filter(o=>{
    if(statusFilter!=="all" && (o.status||"Chờ xử lý")!==statusFilter) return false;
    if(daysFilter!=="all" && (now-new Date(o.date).getTime())/86400000>Number(daysFilter)) return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));
  return <div className="panel table-panel">
    <div className="panel-head">
      <div><b>Tất cả đơn hàng</b><span>{filtered.length} đơn hàng</span></div>
      <div className="filters">
        <select value={daysFilter} onChange={e=>setDaysFilter(e.target.value)}>
          <option value="all">Mọi thời gian</option>
          <option value="7">7 ngày</option>
          <option value="30">30 ngày</option>
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">Mọi trạng thái</option>
          <option value="Chờ xử lý">Chờ xử lý</option>
          <option value="Đang giao">Đang giao</option>
          <option value="Đã giao">Đã giao</option>
        </select>
      </div>
    </div>
    {filtered.length
      ? <table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        {filtered.map(o=><tr key={o.id}>
          <td>#{o.id}</td>
          <td>{o.customerName||"Khách hàng"}</td>
          <td>{new Date(o.date).toLocaleDateString("vi-VN")}</td>
          <td>{money(o.total)}</td>
          <td><span className={`status ${statusClass(o.status)}`}>{o.status||"Chờ xử lý"}</span></td>
          <td><select className="status-select" value={o.status||"Chờ xử lý"} onChange={e=>updateStatus(o.id,e.target.value)}><option>Chờ xử lý</option><option>Đang giao</option><option>Đã giao</option></select></td>
        </tr>)}
      </tbody></table>
      : <div className="empty" style={{padding:"60px 0"}}><h3>Chưa có đơn hàng nào</h3><p>Đơn hàng sẽ xuất hiện ở đây khi khách đặt hàng bên trang khách hàng.</p></div>}
  </div>
}

function Products({inventory,stock,reload,openAdd}){
  const [editing,setEditing]=useState(null);
  return <div className="panel table-panel">
    <div className="panel-head"><div><b>Kho sản phẩm</b><span>{inventory.length} sản phẩm</span></div><button className="primary small" onClick={openAdd}><Plus size={16}/> Thêm sản phẩm</button></div>
    <table><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>{inventory.map(p=>{
        const qty=stock[p.id]??0;
        return <tr key={p.id}>
          <td><div className="product-cell"><img src={p.image}/><b>{p.name}</b></div></td>
          <td>{p.category}</td>
          <td>{money(p.price)}</td>
          <td>{qty}</td>
          <td><span className={`status ${qty>0?"done":""}`}>{qty>0?"Đang bán":"Hết hàng"}</span></td>
          <td><div className="row-actions"><button className="more" onClick={()=>setEditing(p)} title="Sửa sản phẩm"><Pencil size={15}/></button><button className="more" onClick={()=>api(`/products/${p.id}`,{method:"DELETE",admin:true}).then(reload).catch(e=>alert(e.message))} title="Xóa sản phẩm"><Trash2 size={15}/></button></div></td>
        </tr>
      })}</tbody>
    </table>
    {editing && <EditProduct product={editing} stockQty={stock[editing.id]??0} close={()=>setEditing(null)} save={(fields,qty)=>{
      api(`/products/${editing.id}`,{method:"PUT",admin:true,body:{...fields,stock:qty}}).then(()=>{reload();setEditing(null)}).catch(e=>alert(e.message));
    }}/>}
  </div>
}

function ImageField({value,onChange}){
  const fileRef=useRef(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const pick=async e=>{
    const f=e.target.files?.[0];
    e.target.value="";
    if(!f) return;
    if(!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return setErr("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF");
    if(f.size>5*1024*1024) return setErr("Ảnh tối đa 5MB");
    setBusy(true); setErr("");
    try{ onChange(await uploadImage(f)); }
    catch(ex){ setErr(ex.message); }
    finally{ setBusy(false); }
  };
  return <>
    <label>Ảnh sản phẩm
      <div className="image-input">
        <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Dán URL ảnh hoặc bấm Tải ảnh lên"/>
        <button type="button" className="secondary" disabled={busy} onClick={()=>fileRef.current?.click()}>{busy?"Đang tải...":"Tải ảnh lên"}</button>
      </div>
    </label>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pick}/>
    {err && <small className="image-error">{err}</small>}
    {value && <div className="image-preview"><img key={value} src={value} alt="Xem trước" onError={e=>e.target.style.display="none"}/></div>}
  </>
}

function EditProduct({product,stockQty,close,save}){
  const [name,setName]=useState(product.name);
  const [image,setImage]=useState(product.image||"");
  const [oldPrice,setOldPrice]=useState(String(product.old??product.price));
  const [price,setPrice]=useState(String(product.price));
  const percentMatch=/^-(\d+)%$/.exec(product.tag||"");
  const [discount,setDiscount]=useState(percentMatch?percentMatch[1]:"");
  const [category,setCategory]=useState(product.category);
  const [tag,setTag]=useState(percentMatch ? "Sale" : (PRODUCT_TAGS.includes(product.tag) ? product.tag : PRODUCT_TAGS[0]));
  const [qty,setQty]=useState(String(stockQty));
  const canSubmit=name && price && image;
  const applyDiscount=v=>{
    setDiscount(v);
    if(oldPrice && v) setPrice(String(Math.round(+oldPrice*(1-Math.min(+v,100)/100))));
  };
  return <div className="modal-bg"><div className="modal">
    <div className="modal-head"><div><span className="eyebrow">INVENTORY</span><h2>Sửa sản phẩm</h2></div><button className="icon-btn" onClick={close}><X/></button></div>
    <label>Tên sản phẩm<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ví dụ: Urban Shirt"/></label>
    <ImageField value={image} onChange={setImage}/>
    <div className="field-row">
      <label>Giá gốc<input value={oldPrice} onChange={e=>{setOldPrice(e.target.value.replace(/[^0-9]/g,""));if(discount) applyDiscount(discount);}} placeholder="1290000"/></label>
      <label>Giá bán (sau giảm)<input value={price} onChange={e=>setPrice(e.target.value.replace(/[^0-9]/g,""))} placeholder="990000"/></label>
    </div>
    <div className="field-row">
      <label>Số lượng tồn kho<input value={qty} onChange={e=>setQty(e.target.value.replace(/[^0-9]/g,""))} placeholder="0"/></label>
      <label>Danh mục<select value={category} onChange={e=>setCategory(e.target.value)}>{PRODUCT_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
    </div>
    <label>Nhãn hiển thị trên sản phẩm<select value={tag} onChange={e=>setTag(e.target.value)}>{PRODUCT_TAGS.map(t=><option key={t}>{t}</option>)}</select></label>
    {tag==="Sale" && <label>Giảm giá (%)<input value={discount} onChange={e=>applyDiscount(e.target.value.replace(/[^0-9]/g,""))} placeholder="17"/>{!oldPrice && <small style={{fontWeight:400,color:"#999"}}>Nhập giá gốc trước để tự tính giá bán</small>}</label>}
    <div className="modal-actions">
      <button className="secondary" onClick={close}>Hủy</button>
      <button className="primary" disabled={!canSubmit} onClick={()=>{
        const pct=discount ? +discount : (oldPrice && +oldPrice>0 ? Math.round((1-(+price/+oldPrice))*100) : 0);
        save({
          name,
          image,
          price:+price,
          old:oldPrice ? +oldPrice : +price,
          category,
          tag:tag==="Sale" ? `-${pct}%` : tag
        },Math.max(0,+qty||0));
      }}>Lưu thay đổi</button>
    </div>
  </div></div>
}

function Customers(){
  const {data:orders}=useFetch("/orders",[],true);
  const [search,setSearch]=useState("");
  const map=new Map();
  orders.forEach(o=>{
    const key=o.customerEmail||o.customerName||"unknown";
    const cur=map.get(key)||{name:o.customerName||"Khách hàng",email:o.customerEmail||"—",orders:0,spend:0};
    if(o.customerName) cur.name=o.customerName;
    cur.orders+=1;
    cur.spend+=o.total;
    map.set(key,cur);
  });
  const tierOf=spend=>spend>=20000000?"VIP":spend>=10000000?"Gold":"Silver";
  let list=[...map.values()].map(c=>({...c,tier:tierOf(c.spend)})).sort((a,b)=>b.spend-a.spend);
  if(search.trim()){
    const q=search.trim().toLowerCase();
    list=list.filter(c=>c.name.toLowerCase().includes(q)||c.email.toLowerCase().includes(q));
  }
  return <div className="panel table-panel">
    <div className="panel-head">
      <div><b>Khách hàng</b><span>{list.length} khách hàng</span></div>
      <div className="search-admin"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm khách hàng..."/></div>
    </div>
    {list.length
      ? <table><thead><tr><th>Khách hàng</th><th>Email</th><th>Đơn hàng</th><th>Chi tiêu</th><th>Hạng</th></tr></thead><tbody>
        {list.map(c=><tr key={c.email+c.name}>
          <td><div className="customer-cell"><div className="avatar">{c.name.trim().split(" ").map(x=>x[0]).slice(-2).join("").toUpperCase()}</div><b>{c.name}</b></div></td>
          <td>{c.email}</td>
          <td>{c.orders}</td>
          <td>{money(c.spend)}</td>
          <td><span className="tier">{c.tier}</span></td>
        </tr>)}
      </tbody></table>
      : <div className="empty" style={{padding:"60px 0"}}><h3>Chưa có khách hàng nào</h3><p>Khách hàng sẽ xuất hiện ở đây khi có đơn hàng được đặt bên trang khách hàng.</p></div>}
  </div>
}

function Analytics({inventory}){
  const {data:orders}=useFetch("/orders",[],true);
  const revenue=orders.reduce((s,o)=>s+o.total,0);
  const avgOrder=orders.length ? revenue/orders.length : 0;
  const delivered=orders.filter(o=>o.status==="Đã giao").length;
  const deliveredRate=orders.length ? (delivered/orders.length*100) : 0;
  const catRevenue={};
  orders.forEach(o=>(o.items||[]).forEach(it=>{
    const prod=inventory.find(p=>p.id===it.id);
    const cat=prod ? prod.category : "Khác";
    catRevenue[cat]=(catRevenue[cat]||0)+it.price*it.qty;
  }));
  const topCat=Object.entries(catRevenue).sort((a,b)=>b[1]-a[1])[0];
  const topCatShare=topCat && revenue>0 ? (topCat[1]/revenue*100) : 0;
  const days=[...Array(9)].map((_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(8-i));
    const key=d.toISOString().slice(0,10);
    return orders.filter(o=>o.date.slice(0,10)===key).length;
  });
  const maxDay=Math.max(...days,1);
  return <div className="analytics-cards">
    <div className="panel insight">
      <span className="eyebrow">TỶ LỆ GIAO THÀNH CÔNG</span>
      <h2>{orders.length ? deliveredRate.toFixed(1) : "0"}%</h2>
      <p>{orders.length ? `${delivered}/${orders.length} đơn hàng đã giao thành công.` : "Chưa có đơn hàng nào để tính tỷ lệ."}</p>
      <div className="spark">{days.map((d,i)=><i key={i} style={{height:Math.max((d/maxDay)*100,4)+"%"}}/>)}</div>
    </div>
    <div className="panel insight">
      <span className="eyebrow">GIÁ TRỊ ĐƠN TRUNG BÌNH</span>
      <h2>{money(avgOrder)}</h2>
      <p>{orders.length ? "Tính trung bình trên toàn bộ đơn hàng thực tế." : "Chưa có đơn hàng nào để tính giá trị trung bình."}</p>
      <div className="progress"><i style={{width:(orders.length ? Math.min((avgOrder/2000000)*100,100) : 0)+"%"}}/></div>
    </div>
    <div className="panel insight">
      <span className="eyebrow">DANH MỤC BÁN CHẠY</span>
      <h2>{topCat ? topCat[0] : "Chưa có dữ liệu"}</h2>
      <p>{topCat ? `Chiếm ${topCatShare.toFixed(0)}% tổng doanh thu.` : "Chưa có đơn hàng nào để phân tích danh mục."}</p>
      <div className="category-stat"><b>{topCat ? topCatShare.toFixed(0)+"%" : "—"}</b><span>{topCat ? topCat[0] : ""}</span></div>
    </div>
  </div>
}

const PRODUCT_TAGS=["Bán chạy","Mới","Hot","Sale","Limited"];
const PRODUCT_CATEGORIES=["Thời trang","Giày","Phụ kiện"];

function AddProduct({close,add}){
  const [name,setName]=useState("");
  const [image,setImage]=useState("");
  const [oldPrice,setOldPrice]=useState("");
  const [price,setPrice]=useState("");
  const [discount,setDiscount]=useState("");
  const [qty,setQty]=useState("");
  const [category,setCategory]=useState(PRODUCT_CATEGORIES[0]);
  const [tag,setTag]=useState(PRODUCT_TAGS[0]);
  const canSubmit=name && price && image;
  const applyDiscount=v=>{
    setDiscount(v);
    if(oldPrice && v) setPrice(String(Math.round(+oldPrice*(1-Math.min(+v,100)/100))));
  };
  return <div className="modal-bg"><div className="modal">
    <div className="modal-head"><div><span className="eyebrow">INVENTORY</span><h2>Thêm sản phẩm</h2></div><button className="icon-btn" onClick={close}><X/></button></div>
    <label>Tên sản phẩm<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ví dụ: Urban Shirt"/></label>
    <ImageField value={image} onChange={setImage}/>
    <div className="field-row">
      <label>Giá gốc<input value={oldPrice} onChange={e=>{setOldPrice(e.target.value.replace(/[^0-9]/g,""));if(discount) applyDiscount(discount);}} placeholder="1290000"/></label>
      <label>Giá bán (sau giảm)<input value={price} onChange={e=>setPrice(e.target.value.replace(/[^0-9]/g,""))} placeholder="990000"/></label>
    </div>
    <div className="field-row">
      <label>Số lượng tồn kho<input value={qty} onChange={e=>setQty(e.target.value.replace(/[^0-9]/g,""))} placeholder="0"/></label>
      <label>Danh mục<select value={category} onChange={e=>setCategory(e.target.value)}>{PRODUCT_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
    </div>
    <label>Nhãn hiển thị trên sản phẩm<select value={tag} onChange={e=>setTag(e.target.value)}>{PRODUCT_TAGS.map(t=><option key={t}>{t}</option>)}</select></label>
    {tag==="Sale" && <label>Giảm giá (%)<input value={discount} onChange={e=>applyDiscount(e.target.value.replace(/[^0-9]/g,""))} placeholder="17"/>{!oldPrice && <small style={{fontWeight:400,color:"#999"}}>Nhập giá gốc trước để tự tính giá bán</small>}</label>}
    <div className="modal-actions">
      <button className="secondary" onClick={close}>Hủy</button>
      <button className="primary" disabled={!canSubmit} onClick={()=>{
        const pct=discount ? +discount : (oldPrice && +oldPrice>0 ? Math.round((1-(+price/+oldPrice))*100) : 0);
        add({
        name,
        image,
        price:+price,
        old:oldPrice ? +oldPrice : +price,
        category,
        tag:tag==="Sale" ? `-${pct}%` : tag,
        rating:5
      },Math.max(0,+qty||0));
      }}>Thêm sản phẩm</button>
    </div>
  </div></div>
}

function App(){
  const [cart,setCart]=useLocalState("hai_cart",[]);
  const route=useHashRoute();
  const adminPath=window.location.pathname.startsWith("/admin");
  const customerAuthed=typeof window!=="undefined" && localStorage.getItem("hai_customer_auth")==="1";
  const adminAuthed=typeof window!=="undefined" && localStorage.getItem("hai_admin_auth")==="1";

  if(adminPath && window.location.pathname==="/admin/login") return <Login admin/>;
  if(adminPath && !adminAuthed){ window.location.replace("/admin/login"); return null; }
  if(adminPath) return <Admin/>;
  if(window.location.pathname==="/reset-password") return <ResetPassword/>;
  if(window.location.pathname==="/login") return <Login/>;
  return <Customer cart={cart} setCart={setCart} customerAuthed={customerAuthed}/>;
}

createRoot(document.getElementById("root")).render(<App/>);