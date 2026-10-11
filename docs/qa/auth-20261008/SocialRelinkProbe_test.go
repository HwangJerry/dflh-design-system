// Expected-behavior QA probe. Keep outside the default suite while this defect is open.
package main

import (
	"context"
	"testing"

	"github.com/dflh-saf/backend/internal/model"
	"github.com/dflh-saf/backend/internal/service"
)

func TestAuthQASocialRelinkAfterDisconnect(t *testing.T) {
	s := newGoldenServer(t)
	seedGoldenMember(t, s.db)
	s.deps.authRepo.EnableCanonicalIdentityWrites()
	social := service.NewSocialAuthService(s.deps.authService,
		service.NewMobileSessionIssuer(s.deps.authService),
		service.NewSocialLinkTokenStore(s.deps.cacheStore), nil,
		authQASocialVerifier{subject: "synthetic-auth-qa-relink-subject"})
	ctx := context.Background()
	authorization := model.KakaoAuthorization{AccessToken: "synthetic-provider-token"}
	linked, err := social.LinkIdentity(ctx, goldenMemberID, "kakao", authorization)
	if err != nil || len(linked.Providers) != 1 || !linked.HasPassword {
		t.Fatalf("initial link failed: %v", err)
	}
	disconnected, err := s.deps.authService.Disconnect(goldenMemberID, "kakao")
	if err != nil || len(disconnected.Connections.Providers) != 0 || !disconnected.Connections.HasPassword {
		t.Fatalf("disconnect must retain password access: %v", err)
	}
	goldenCount(t, s.db, 1, `SELECT COUNT(*) FROM AUTH_IDENTITY WHERE ACCOUNT_ID=? AND PROVIDER='KAKAO' AND STATUS='REVOKED'`, goldenMemberID)
	s.login(t, "android") // Control: the native login still works.
	_, err = social.LinkIdentity(ctx, goldenMemberID, "kakao", authorization)
	if err != nil {
		t.Fatalf("verified provider must be relinkable after disconnect: %v", err)
	}
	goldenCount(t, s.db, 1, `SELECT COUNT(*) FROM AUTH_IDENTITY WHERE ACCOUNT_ID=? AND PROVIDER='KAKAO' AND STATUS='ACTIVE'`, goldenMemberID)
}
