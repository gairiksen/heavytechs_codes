(self.webpackChunkmarketplace_template_poc=self.webpackChunkmarketplace_template_poc||[]).push([[530],{9361:function(i,s,e){"use strict";e.r(s);var n=e(4396);const c=(t,l)=>{(0,n.Z)("/api/users/followers/toggle.json",{body:JSON.stringify({user_id:l,action_name:t})}).then(o=>{})},a=Array.from(document.querySelectorAll("button[data-follow-user]")),r=t=>t.classList.toggle("following"),f=t=>{t.preventDefault();const l=t.target.classList.contains("following")?"unfollow":"follow";c(l,t.target.dataset.followUser),a.filter(o=>o.dataset.followUser==t.target.dataset.followUser).forEach(o=>r(o))};a.forEach(t=>t.addEventListener("click",f,!0))}}]);
